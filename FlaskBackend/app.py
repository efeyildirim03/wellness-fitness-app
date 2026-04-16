from flask import Flask, request, jsonify
from flask_cors import CORS
from recommendation_engine import RecommendationEngine
from progress_analyzer import ProgressAnalyzer
from motivation_engine import MotivationEngine
import requests

app = Flask(__name__)
CORS(app)

recommendation_engine = RecommendationEngine()
progress_analyzer = ProgressAnalyzer()
motivation_engine = MotivationEngine()

# USDA FoodData Central API Key

USDA_API_KEY = 'eYvHG0amqMT7gXPwUJotL3EOJHKy1tI0JAlPIhEz'

# ─────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'running',
        'message': 'FitnessApp Flask Backend is live!',
        'endpoints': [
            '/api/recommendations',
            '/api/progress',
            '/api/motivation',
            '/api/food-search',
            '/api/food-nutrients',
        ]
    })

# ─────────────────────────────────────────
# UC-09: RECOMMENDATIONS
# ─────────────────────────────────────────
@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        result = recommendation_engine.analyze(data)
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─────────────────────────────────────────
# UC-10: PROGRESS ANALYSIS
# ─────────────────────────────────────────
@app.route('/api/progress', methods=['POST'])
def get_progress():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        workouts = data.get('workouts', [])
        meals = data.get('meals', [])
        moods = data.get('moods', [])
        period = data.get('period', 'weekly')
        if period == 'monthly':
            result = progress_analyzer.analyze_monthly(workouts, meals, moods)
        else:
            result = progress_analyzer.analyze_weekly(workouts, meals, moods)
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─────────────────────────────────────────
# UC-11: MOTIVATIONAL MESSAGES
# ─────────────────────────────────────────
@app.route('/api/motivation', methods=['POST'])
def get_motivation():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        result = motivation_engine.generate(data)
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─────────────────────────────────────────
# FOOD SEARCH — USDA FoodData Central
# ─────────────────────────────────────────
@app.route('/api/food-search', methods=['GET'])
def food_search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'No search query provided'}), 400

    try:
        url = 'https://api.nal.usda.gov/fdc/v1/foods/search'
        params = {
            'query': query,
            'api_key': USDA_API_KEY,
            'pageSize': 10,
            'dataType': 'SR Legacy,Survey (FNDDS)',
        }

        response = requests.get(url, params=params, timeout=10)

        if response.status_code != 200:
            print(f"USDA API error: {response.status_code}")
            return jsonify({'success': True, 'data': get_fallback_foods(query)})

        data = response.json()
        products = []

        for food in data.get('foods', []):
            nutrients = {}
            for n in food.get('foodNutrients', []):
                nutrients[n.get('nutrientName', '')] = n.get('value', 0)

            calories = nutrients.get('Energy', 0) or 0
            protein = nutrients.get('Protein', 0) or 0
            carbs = nutrients.get('Carbohydrate, by difference', 0) or 0
            fats = nutrients.get('Total lipid (fat)', 0) or 0

            if calories == 0:
                continue

            name = food.get('description', '').title()
            if not name:
                continue

            products.append({
                'name': name,
                'brand': food.get('brandOwner', 'USDA Database'),
                'serving_size': '100g',
                'calories_per_100g': round(float(calories)),
                'protein_per_100g': round(float(protein), 1),
                'carbs_per_100g': round(float(carbs), 1),
                'fats_per_100g': round(float(fats), 1),
                'fdc_id': str(food.get('fdcId', '')),
            })

        products = products[:8]

        if not products:
            print("No USDA results, using fallback")
            return jsonify({'success': True, 'data': get_fallback_foods(query)})

        return jsonify({'success': True, 'data': products})

    except requests.exceptions.Timeout:
        print("USDA API timeout, using fallback")
        return jsonify({'success': True, 'data': get_fallback_foods(query)})
    except Exception as e:
        print(f"Food search error: {e}")
        return jsonify({'success': True, 'data': get_fallback_foods(query)})


# ─────────────────────────────────────────
# FOOD NUTRIENTS — detailed per quantity
# ─────────────────────────────────────────
@app.route('/api/food-nutrients', methods=['POST'])
def food_nutrients():
    try:
        data = request.get_json()
        fdc_id = data.get('fdc_id', '')
        quantity = float(data.get('quantity', 100))
        food_name = data.get('food_name', '')
        calories_per_100g = data.get('calories_per_100g', 0)
        protein_per_100g = data.get('protein_per_100g', 0)
        carbs_per_100g = data.get('carbs_per_100g', 0)
        fats_per_100g = data.get('fats_per_100g', 0)

        # If we have fdc_id, fetch detailed nutrients from USDA
        if fdc_id and USDA_API_KEY != 'your_usda_key_here':
            try:
                url = f'https://api.nal.usda.gov/fdc/v1/food/{fdc_id}'
                params = {'api_key': USDA_API_KEY}
                response = requests.get(url, params=params, timeout=10)
                food = response.json()

                nutrients = {}
                for n in food.get('foodNutrients', []):
                    nutrient = n.get('nutrient', {})
                    nutrients[nutrient.get('name', '')] = n.get('amount', 0)

                ratio = quantity / 100
                calories = nutrients.get('Energy', calories_per_100g) or calories_per_100g
                protein = nutrients.get('Protein', protein_per_100g) or protein_per_100g
                carbs = nutrients.get('Carbohydrate, by difference', carbs_per_100g) or carbs_per_100g
                fats = nutrients.get('Total lipid (fat)', fats_per_100g) or fats_per_100g
                fiber = nutrients.get('Fiber, total dietary', 0) or 0
                sugar = nutrients.get('Sugars, total including NLEA', 0) or 0

                return jsonify({
                    'success': True,
                    'data': {
                        'name': food.get('description', food_name).title(),
                        'quantity': quantity,
                        'calories': round(float(calories) * ratio),
                        'protein': round(float(protein) * ratio, 1),
                        'carbs': round(float(carbs) * ratio, 1),
                        'fats': round(float(fats) * ratio, 1),
                        'fiber': round(float(fiber) * ratio, 1),
                        'sugar': round(float(sugar) * ratio, 1),
                    }
                })
            except Exception as e:
                print(f"USDA detail error: {e}")

        # Fallback — calculate from per_100g values
        ratio = quantity / 100
        return jsonify({
            'success': True,
            'data': {
                'name': food_name,
                'quantity': quantity,
                'calories': round(float(calories_per_100g) * ratio),
                'protein': round(float(protein_per_100g) * ratio, 1),
                'carbs': round(float(carbs_per_100g) * ratio, 1),
                'fats': round(float(fats_per_100g) * ratio, 1),
                'fiber': 0,
                'sugar': 0,
            }
        })

    except Exception as e:
        print(f"Nutrients error: {e}")
        return jsonify({'success': False, 'error': str(e)})


# ─────────────────────────────────────────
# FALLBACK FOOD DATABASE
# ─────────────────────────────────────────
def get_fallback_foods(query):
    fallback_db = [
        {'name': 'Banana', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 89, 'protein_per_100g': 1.1, 'carbs_per_100g': 23.0, 'fats_per_100g': 0.3, 'fdc_id': ''},
        {'name': 'Apple', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 52, 'protein_per_100g': 0.3, 'carbs_per_100g': 14.0, 'fats_per_100g': 0.2, 'fdc_id': ''},
        {'name': 'Chicken Breast', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 165, 'protein_per_100g': 31.0, 'carbs_per_100g': 0.0, 'fats_per_100g': 3.6, 'fdc_id': ''},
        {'name': 'White Rice Cooked', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 130, 'protein_per_100g': 2.7, 'carbs_per_100g': 28.0, 'fats_per_100g': 0.3, 'fdc_id': ''},
        {'name': 'Whole Egg', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 155, 'protein_per_100g': 13.0, 'carbs_per_100g': 1.1, 'fats_per_100g': 11.0, 'fdc_id': ''},
        {'name': 'Brown Bread', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 247, 'protein_per_100g': 9.0, 'carbs_per_100g': 41.0, 'fats_per_100g': 3.4, 'fdc_id': ''},
        {'name': 'Whole Milk', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 61, 'protein_per_100g': 3.2, 'carbs_per_100g': 4.8, 'fats_per_100g': 3.3, 'fdc_id': ''},
        {'name': 'Oats', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 389, 'protein_per_100g': 17.0, 'carbs_per_100g': 66.0, 'fats_per_100g': 7.0, 'fdc_id': ''},
        {'name': 'Salmon', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 208, 'protein_per_100g': 20.0, 'carbs_per_100g': 0.0, 'fats_per_100g': 13.0, 'fdc_id': ''},
        {'name': 'Broccoli', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 34, 'protein_per_100g': 2.8, 'carbs_per_100g': 7.0, 'fats_per_100g': 0.4, 'fdc_id': ''},
        {'name': 'Sweet Potato', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 86, 'protein_per_100g': 1.6, 'carbs_per_100g': 20.0, 'fats_per_100g': 0.1, 'fdc_id': ''},
        {'name': 'Greek Yogurt', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 59, 'protein_per_100g': 10.0, 'carbs_per_100g': 3.6, 'fats_per_100g': 0.4, 'fdc_id': ''},
        {'name': 'Almonds', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 579, 'protein_per_100g': 21.0, 'carbs_per_100g': 22.0, 'fats_per_100g': 50.0, 'fdc_id': ''},
        {'name': 'Orange', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 47, 'protein_per_100g': 0.9, 'carbs_per_100g': 12.0, 'fats_per_100g': 0.1, 'fdc_id': ''},
        {'name': 'Tuna Canned', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 116, 'protein_per_100g': 26.0, 'carbs_per_100g': 0.0, 'fats_per_100g': 1.0, 'fdc_id': ''},
        {'name': 'Lentils Cooked', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 116, 'protein_per_100g': 9.0, 'carbs_per_100g': 20.0, 'fats_per_100g': 0.4, 'fdc_id': ''},
        {'name': 'Pasta Cooked', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 158, 'protein_per_100g': 5.8, 'carbs_per_100g': 31.0, 'fats_per_100g': 0.9, 'fdc_id': ''},
        {'name': 'Avocado', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 160, 'protein_per_100g': 2.0, 'carbs_per_100g': 9.0, 'fats_per_100g': 15.0, 'fdc_id': ''},
        {'name': 'Lean Beef', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 250, 'protein_per_100g': 26.0, 'carbs_per_100g': 0.0, 'fats_per_100g': 15.0, 'fdc_id': ''},
        {'name': 'Spinach', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 23, 'protein_per_100g': 2.9, 'carbs_per_100g': 3.6, 'fats_per_100g': 0.4, 'fdc_id': ''},
        {'name': 'Chapati', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 297, 'protein_per_100g': 8.0, 'carbs_per_100g': 52.0, 'fats_per_100g': 7.0, 'fdc_id': ''},
        {'name': 'Dal Cooked', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 116, 'protein_per_100g': 9.0, 'carbs_per_100g': 20.0, 'fats_per_100g': 0.4, 'fdc_id': ''},
        {'name': 'Biryani Rice', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 180, 'protein_per_100g': 5.0, 'carbs_per_100g': 32.0, 'fats_per_100g': 4.0, 'fdc_id': ''},
        {'name': 'Mango', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 60, 'protein_per_100g': 0.8, 'carbs_per_100g': 15.0, 'fats_per_100g': 0.4, 'fdc_id': ''},
        {'name': 'Paneer', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 265, 'protein_per_100g': 18.0, 'carbs_per_100g': 3.5, 'fats_per_100g': 20.0, 'fdc_id': ''},
        {'name': 'Peanut Butter', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 588, 'protein_per_100g': 25.0, 'carbs_per_100g': 20.0, 'fats_per_100g': 50.0, 'fdc_id': ''},
        {'name': 'Orange Juice', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 45, 'protein_per_100g': 0.7, 'carbs_per_100g': 10.4, 'fats_per_100g': 0.2, 'fdc_id': ''},
        {'name': 'Watermelon', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 30, 'protein_per_100g': 0.6, 'carbs_per_100g': 7.6, 'fats_per_100g': 0.2, 'fdc_id': ''},
        {'name': 'Strawberry', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 32, 'protein_per_100g': 0.7, 'carbs_per_100g': 7.7, 'fats_per_100g': 0.3, 'fdc_id': ''},
        {'name': 'Potato Boiled', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 87, 'protein_per_100g': 1.9, 'carbs_per_100g': 20.0, 'fats_per_100g': 0.1, 'fdc_id': ''},
        {'name': 'Cheddar Cheese', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 402, 'protein_per_100g': 25.0, 'carbs_per_100g': 1.3, 'fats_per_100g': 33.0, 'fdc_id': ''},
        {'name': 'Shrimp', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 99, 'protein_per_100g': 24.0, 'carbs_per_100g': 0.2, 'fats_per_100g': 0.3, 'fdc_id': ''},
        {'name': 'Corn', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 86, 'protein_per_100g': 3.2, 'carbs_per_100g': 19.0, 'fats_per_100g': 1.2, 'fdc_id': ''},
        {'name': 'Carrot', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 41, 'protein_per_100g': 0.9, 'carbs_per_100g': 10.0, 'fats_per_100g': 0.2, 'fdc_id': ''},
        {'name': 'Tomato', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 18, 'protein_per_100g': 0.9, 'carbs_per_100g': 3.9, 'fats_per_100g': 0.2, 'fdc_id': ''},
        {'name': 'Cucumber', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 15, 'protein_per_100g': 0.7, 'carbs_per_100g': 3.6, 'fats_per_100g': 0.1, 'fdc_id': ''},
        {'name': 'Onion', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 40, 'protein_per_100g': 1.1, 'carbs_per_100g': 9.3, 'fats_per_100g': 0.1, 'fdc_id': ''},
        {'name': 'Peas', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 81, 'protein_per_100g': 5.4, 'carbs_per_100g': 14.0, 'fats_per_100g': 0.4, 'fdc_id': ''},
        {'name': 'Cauliflower', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 25, 'protein_per_100g': 1.9, 'carbs_per_100g': 5.0, 'fats_per_100g': 0.3, 'fdc_id': ''},
        {'name': 'Dark Chocolate', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 546, 'protein_per_100g': 5.0, 'carbs_per_100g': 60.0, 'fats_per_100g': 31.0, 'fdc_id': ''},
        {'name': 'White Bread', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 265, 'protein_per_100g': 9.0, 'carbs_per_100g': 49.0, 'fats_per_100g': 3.2, 'fdc_id': ''},
        {'name': 'Butter', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 717, 'protein_per_100g': 0.9, 'carbs_per_100g': 0.1, 'fats_per_100g': 81.0, 'fdc_id': ''},
        {'name': 'Olive Oil', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 884, 'protein_per_100g': 0.0, 'carbs_per_100g': 0.0, 'fats_per_100g': 100.0, 'fdc_id': ''},
        {'name': 'Honey', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 304, 'protein_per_100g': 0.3, 'carbs_per_100g': 82.0, 'fats_per_100g': 0.0, 'fdc_id': ''},
        {'name': 'Turkey Breast', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 135, 'protein_per_100g': 30.0, 'carbs_per_100g': 0.0, 'fats_per_100g': 1.0, 'fdc_id': ''},
        {'name': 'Cottage Cheese', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 98, 'protein_per_100g': 11.0, 'carbs_per_100g': 3.4, 'fats_per_100g': 4.3, 'fdc_id': ''},
        {'name': 'Quinoa Cooked', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 120, 'protein_per_100g': 4.4, 'carbs_per_100g': 22.0, 'fats_per_100g': 1.9, 'fdc_id': ''},
        {'name': 'Blueberry', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 57, 'protein_per_100g': 0.7, 'carbs_per_100g': 14.0, 'fats_per_100g': 0.3, 'fdc_id': ''},
        {'name': 'Pork Chop', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 242, 'protein_per_100g': 27.0, 'carbs_per_100g': 0.0, 'fats_per_100g': 14.0, 'fdc_id': ''},
        {'name': 'Bread Roll', 'brand': 'USDA', 'serving_size': '100g', 'calories_per_100g': 284, 'protein_per_100g': 9.0, 'carbs_per_100g': 55.0, 'fats_per_100g': 3.0, 'fdc_id': ''},
    ]

    query_lower = query.lower()
    matched = [f for f in fallback_db if query_lower in f['name'].lower()]
    return matched if matched else fallback_db[:8]


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)