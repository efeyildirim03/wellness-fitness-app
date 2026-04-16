import numpy as np
from datetime import datetime, timedelta

class RecommendationEngine:
    
    def __init__(self):
        self.fitness_rules = self._build_fitness_rules()
        self.nutrition_rules = self._build_nutrition_rules()
        self.wellness_rules = self._build_wellness_rules()

    def _build_fitness_rules(self):
        return [
            {
                'condition': lambda d: d['workout_count'] == 0,
                'tip': '🏃 You haven\'t worked out this week! Start with a 20-minute walk today — consistency beats intensity.',
                'priority': 1
            },
            {
                'condition': lambda d: 0 < d['workout_count'] < 3,
                'tip': f'💪 Good start! Aim for at least 3-4 workout sessions per week for optimal results.',
                'priority': 2
            },
            {
                'condition': lambda d: d['workout_count'] >= 3 and d['avg_calories_burned'] < 200,
                'tip': '🔥 Great consistency! Try increasing workout intensity to burn more calories per session.',
                'priority': 2
            },
            {
                'condition': lambda d: d['workout_count'] >= 5,
                'tip': '⚡ Outstanding dedication! Make sure to include rest days to prevent overtraining and injury.',
                'priority': 3
            },
            {
                'condition': lambda d: d['dominant_workout'] == 'Running' and d['avg_calories_burned'] > 300,
                'tip': '🏃 Your running is paying off! Consider adding strength training 2x per week for balanced fitness.',
                'priority': 2
            },
            {
                'condition': lambda d: d['dominant_workout'] == 'Weightlifting' and d['workout_count'] >= 3,
                'tip': '💪 Great lifting routine! Add 20 min cardio after sessions to improve cardiovascular health.',
                'priority': 2
            },
            {
                'condition': lambda d: d['dominant_intensity'] == 'Low' and d['workout_count'] >= 3,
                'tip': '📈 You\'re consistent but keeping it light. Try one High intensity session this week!',
                'priority': 2
            },
        ]

    def _build_nutrition_rules(self):
        return [
            {
                'condition': lambda d: d['avg_calories_intake'] == 0,
                'tip': '🥗 Start logging your meals to get personalized nutrition advice!',
                'priority': 1
            },
            {
                'condition': lambda d: 0 < d['avg_calories_intake'] < 1200,
                'tip': '⚠️ Your calorie intake seems too low. Undereating can slow metabolism and reduce energy.',
                'priority': 1
            },
            {
                'condition': lambda d: d['avg_calories_intake'] > 2500 and 'weight_loss' in d['active_goals'],
                'tip': '🥗 You\'re targeting weight loss but consuming high calories. Try reducing portion sizes and adding more vegetables.',
                'priority': 1
            },
            {
                'condition': lambda d: d['avg_protein'] < 50 and 'muscle_gain' in d['active_goals'],
                'tip': f'🍗 For muscle gain, increase protein. Aim for 1.6g per kg of body weight daily.',
                'priority': 1
            },
            {
                'condition': lambda d: d['avg_protein'] < 50 and d['workout_count'] >= 3,
                'tip': '🍗 You\'re working out regularly but protein intake is low. Add eggs, chicken, or legumes to meals.',
                'priority': 2
            },
            {
                'condition': lambda d: d['avg_calories_intake'] > 1200 and d['avg_calories_intake'] < 2000 and d['avg_protein'] >= 50,
                'tip': '✅ Great nutrition balance! Keep maintaining consistent meal timing for best results.',
                'priority': 3
            },
            {
                'condition': lambda d: d['meal_count'] < 2,
                'tip': '🍽️ You\'re logging fewer than 2 meals per day. Try to log all meals for accurate tracking.',
                'priority': 2
            },
        ]

    def _build_wellness_rules(self):
        return [
            {
                'condition': lambda d: d['stress_level'] in ['High', 'Very High'],
                'tip': '🧘 High stress detected! Try 10 minutes of deep breathing or meditation today.',
                'priority': 1
            },
            {
                'condition': lambda d: d['sleep_quality'] == 'Poor',
                'tip': '😴 Poor sleep detected. Avoid screens 1 hour before bed and keep a consistent sleep schedule.',
                'priority': 1
            },
            {
                'condition': lambda d: d['avg_mood_score'] < 2.5,
                'tip': '💙 Your mood has been low. Consider a walk in nature, journaling, or reaching out to a friend.',
                'priority': 1
            },
            {
                'condition': lambda d: d['avg_mood_score'] >= 2.5 and d['avg_mood_score'] < 3.5,
                'tip': '😊 Your mood is neutral. A short workout or healthy meal can give you an energy boost!',
                'priority': 2
            },
            {
                'condition': lambda d: d['avg_mood_score'] >= 4 and d['stress_level'] == 'Low',
                'tip': '🌟 You\'re in great shape mentally! Channel this positive energy into hitting your fitness goals.',
                'priority': 3
            },
            {
                'condition': lambda d: d['mood_count'] == 0,
                'tip': '📝 Start tracking your mood daily — it helps identify patterns between your activity and wellbeing.',
                'priority': 1
            },
            {
                'condition': lambda d: d['stress_level'] == 'Moderate' and d['sleep_quality'] in ['Fair', 'Poor'],
                'tip': '🛌 Moderate stress + poor sleep is a risky combo. Prioritize 7-8 hours tonight and try a relaxing routine.',
                'priority': 2
            },
        ]

    def analyze(self, data):
        """
        Main analysis function — correlates workout + nutrition + mood data
        Returns personalized recommendations
        """
        # Normalize data
        d = {
            'workout_count': data.get('workoutCount', 0),
            'avg_calories_burned': data.get('avgCaloriesBurned', 0),
            'avg_calories_intake': data.get('avgCaloriesIntake', 0),
            'avg_protein': data.get('avgProtein', 0),
            'avg_mood_score': float(data.get('avgMoodScore', 3)),
            'stress_level': data.get('stressLevel', 'Low'),
            'sleep_quality': data.get('sleepQuality', 'Good'),
            'active_goals': data.get('activeGoals', []),
            'dominant_workout': data.get('dominantWorkout', ''),
            'dominant_intensity': data.get('dominantIntensity', 'Medium'),
            'meal_count': data.get('mealCount', 0),
            'mood_count': data.get('moodCount', 0),
        }

        # Cross-correlation analysis
        correlations = self._analyze_correlations(d)

        # Get best matching tip for each category
        fitness_tip = self._get_best_tip(self.fitness_rules, d)
        nutrition_tip = self._get_best_tip(self.nutrition_rules, d)
        wellness_tip = self._get_best_tip(self.wellness_rules, d)

        # Calculate wellness score
        wellness_score = self._calculate_wellness_score(d)

        return {
            'fitness_tip': fitness_tip,
            'nutrition_tip': nutrition_tip,
            'wellness_tip': wellness_tip,
            'wellness_score': wellness_score,
            'correlations': correlations,
            'generated_date': datetime.now().strftime('%Y-%m-%d'),
        }

    def _get_best_tip(self, rules, data):
        matched = []
        for rule in rules:
            try:
                if rule['condition'](data):
                    matched.append(rule)
            except:
                pass
        
        if not matched:
            return '📊 Keep logging your data for more personalized recommendations!'
        
        # Return highest priority match
        matched.sort(key=lambda x: x['priority'])
        return matched[0]['tip']

    def _analyze_correlations(self, d):
        correlations = []

        # Mood vs Workout correlation
        if d['workout_count'] >= 3 and d['avg_mood_score'] >= 3.5:
            correlations.append('✅ Your regular workouts are positively impacting your mood!')
        elif d['workout_count'] < 2 and d['avg_mood_score'] < 3:
            correlations.append('⚠️ Low activity and low mood detected — exercise can significantly boost mood.')

        # Sleep vs Performance correlation
        if d['sleep_quality'] in ['Poor', 'Fair'] and d['avg_calories_burned'] < 200:
            correlations.append('😴 Poor sleep may be affecting your workout performance.')

        # Nutrition vs Mood correlation
        if d['avg_calories_intake'] < 1200 and d['avg_mood_score'] < 3:
            correlations.append('🍽️ Low calorie intake may be contributing to low mood and energy.')

        # Stress vs Sleep correlation
        if d['stress_level'] in ['High', 'Very High'] and d['sleep_quality'] in ['Poor', 'Fair']:
            correlations.append('🧘 High stress is likely affecting your sleep quality.')

        return correlations

    def _calculate_wellness_score(self, d):
        score = 0
        max_score = 100

        # Workout score (30 points)
        workout_score = min(d['workout_count'] / 5 * 30, 30)
        score += workout_score

        # Nutrition score (30 points)
        if 1200 <= d['avg_calories_intake'] <= 2500:
            score += 30
        elif d['avg_calories_intake'] > 0:
            score += 15

        # Mood score (20 points)
        mood_score = (d['avg_mood_score'] / 5) * 20
        score += mood_score

        # Sleep score (10 points)
        sleep_scores = {'Excellent': 10, 'Good': 8, 'Fair': 5, 'Poor': 2}
        score += sleep_scores.get(d['sleep_quality'], 5)

        # Stress score (10 points)
        stress_scores = {'Low': 10, 'Moderate': 7, 'High': 3, 'Very High': 1}
        score += stress_scores.get(d['stress_level'], 5)

        return round(score)