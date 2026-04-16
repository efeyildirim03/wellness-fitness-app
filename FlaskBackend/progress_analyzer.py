from datetime import datetime, timedelta
import numpy as np

class ProgressAnalyzer:

    def analyze_weekly(self, workouts, meals, moods):
        """Analyze last 7 days of data"""
        today = datetime.now()
        week_ago = today - timedelta(days=7)

        weekly_workouts = self._filter_by_date(workouts, week_ago)
        weekly_meals = self._filter_by_date(meals, week_ago)
        weekly_moods = self._filter_by_date(moods, week_ago)

        return {
            'period': 'weekly',
            'workout_summary': self._analyze_workouts(weekly_workouts),
            'nutrition_summary': self._analyze_nutrition(weekly_meals),
            'mood_summary': self._analyze_moods(weekly_moods),
            'overall_score': self._calculate_progress_score(
                weekly_workouts, weekly_meals, weekly_moods
            ),
            'achievements': self._check_achievements(
                weekly_workouts, weekly_meals, weekly_moods
            ),
            'trends': self._analyze_trends(
                weekly_workouts, weekly_meals, weekly_moods
            ),
        }

    def analyze_monthly(self, workouts, meals, moods):
        """Analyze last 30 days of data"""
        today = datetime.now()
        month_ago = today - timedelta(days=30)

        monthly_workouts = self._filter_by_date(workouts, month_ago)
        monthly_meals = self._filter_by_date(meals, month_ago)
        monthly_moods = self._filter_by_date(moods, month_ago)

        return {
            'period': 'monthly',
            'workout_summary': self._analyze_workouts(monthly_workouts),
            'nutrition_summary': self._analyze_nutrition(monthly_meals),
            'mood_summary': self._analyze_moods(monthly_moods),
            'overall_score': self._calculate_progress_score(
                monthly_workouts, monthly_meals, monthly_moods
            ),
            'achievements': self._check_achievements(
                monthly_workouts, monthly_meals, monthly_moods
            ),
            'trends': self._analyze_trends(
                monthly_workouts, monthly_meals, monthly_moods
            ),
            'weekly_breakdown': self._weekly_breakdown(
                monthly_workouts, monthly_meals, monthly_moods
            ),
        }

    def _filter_by_date(self, data, since):
        filtered = []
        for item in data:
            try:
                item_date = datetime.strptime(item.get('date', ''), '%Y-%m-%d')
                if item_date >= since:
                    filtered.append(item)
            except:
                pass
        return filtered

    def _analyze_workouts(self, workouts):
        if not workouts:
            return {
                'total_sessions': 0,
                'total_calories_burned': 0,
                'total_duration': 0,
                'avg_calories_per_session': 0,
                'most_common_type': 'None',
                'intensity_breakdown': {'Low': 0, 'Medium': 0, 'High': 0},
                'message': 'No workouts logged in this period.'
            }

        total_calories = sum(w.get('calories_burned', 0) for w in workouts)
        total_duration = sum(w.get('duration', 0) for w in workouts)

        # Most common workout type
        types = [w.get('type', 'Other') for w in workouts]
        most_common = max(set(types), key=types.count) if types else 'None'

        # Intensity breakdown
        intensities = {'Low': 0, 'Medium': 0, 'High': 0}
        for w in workouts:
            intensity = w.get('intensity', 'Medium')
            if intensity in intensities:
                intensities[intensity] += 1

        return {
            'total_sessions': len(workouts),
            'total_calories_burned': round(total_calories),
            'total_duration': round(total_duration),
            'avg_calories_per_session': round(total_calories / len(workouts)),
            'most_common_type': most_common,
            'intensity_breakdown': intensities,
            'message': self._workout_message(len(workouts), total_calories),
        }

    def _analyze_nutrition(self, meals):
        if not meals:
            return {
                'total_meals_logged': 0,
                'avg_daily_calories': 0,
                'avg_protein': 0,
                'avg_carbs': 0,
                'avg_fats': 0,
                'most_common_meal_type': 'None',
                'message': 'No meals logged in this period.'
            }

        total_calories = sum(m.get('calories_intake', 0) for m in meals)
        total_protein = sum(m.get('protein', 0) for m in meals)
        total_carbs = sum(m.get('carbs', 0) for m in meals)
        total_fats = sum(m.get('fats', 0) for m in meals)

        # Get unique days
        days = set(m.get('date', '') for m in meals)
        num_days = max(len(days), 1)

        # Most common meal type
        meal_types = [m.get('meal_type', 'Other') for m in meals]
        most_common = max(set(meal_types), key=meal_types.count) if meal_types else 'None'

        return {
            'total_meals_logged': len(meals),
            'avg_daily_calories': round(total_calories / num_days),
            'avg_protein': round(total_protein / num_days),
            'avg_carbs': round(total_carbs / num_days),
            'avg_fats': round(total_fats / num_days),
            'most_common_meal_type': most_common,
            'message': self._nutrition_message(total_calories / num_days),
        }

    def _analyze_moods(self, moods):
        if not moods:
            return {
                'total_entries': 0,
                'avg_mood_score': 0,
                'most_common_mood': 'None',
                'stress_breakdown': {},
                'sleep_breakdown': {},
                'message': 'No mood entries in this period.'
            }

        scores = [m.get('mood_score', 3) for m in moods]
        avg_score = sum(scores) / len(scores)

        mood_levels = [m.get('mood_level', 'Neutral') for m in moods]
        most_common = max(set(mood_levels), key=mood_levels.count)

        # Stress breakdown
        stress_levels = [m.get('stress_level', 'Low') for m in moods if m.get('stress_level')]
        stress_breakdown = {}
        for s in set(stress_levels):
            stress_breakdown[s] = stress_levels.count(s)

        # Sleep breakdown
        sleep_levels = [m.get('sleep_quality', 'Good') for m in moods if m.get('sleep_quality')]
        sleep_breakdown = {}
        for s in set(sleep_levels):
            sleep_breakdown[s] = sleep_levels.count(s)

        return {
            'total_entries': len(moods),
            'avg_mood_score': round(avg_score, 1),
            'mood_scores_over_time': scores[-7:],
            'most_common_mood': most_common,
            'stress_breakdown': stress_breakdown,
            'sleep_breakdown': sleep_breakdown,
            'message': self._mood_message(avg_score),
        }

    def _calculate_progress_score(self, workouts, meals, moods):
        score = 0

        # Workout contribution (40 points)
        workout_score = min(len(workouts) / 5 * 40, 40)
        score += workout_score

        # Nutrition contribution (30 points)
        if meals:
            avg_cal = sum(m.get('calories_intake', 0) for m in meals) / len(meals)
            if 1200 <= avg_cal <= 2500:
                score += 30
            elif avg_cal > 0:
                score += 15

        # Mood contribution (30 points)
        if moods:
            avg_mood = sum(m.get('mood_score', 3) for m in moods) / len(moods)
            mood_score = (avg_mood / 5) * 30
            score += mood_score

        return round(score)

    def _check_achievements(self, workouts, meals, moods):
        achievements = []

        if len(workouts) >= 5:
            achievements.append({
                'icon': '🏆',
                'title': 'Workout Warrior',
                'description': '5+ workouts this period!'
            })

        if len(workouts) >= 3:
            achievements.append({
                'icon': '🔥',
                'title': 'On Fire',
                'description': '3+ workout streak!'
            })

        total_calories_burned = sum(w.get('calories_burned', 0) for w in workouts)
        if total_calories_burned >= 1000:
            achievements.append({
                'icon': '⚡',
                'title': 'Calorie Crusher',
                'description': f'Burned {round(total_calories_burned)} calories!'
            })

        if len(meals) >= 14:
            achievements.append({
                'icon': '🥗',
                'title': 'Nutrition Tracker',
                'description': 'Logged 14+ meals!'
            })

        if len(moods) >= 5:
            achievements.append({
                'icon': '😊',
                'title': 'Self Aware',
                'description': 'Tracked mood 5+ times!'
            })

        if moods:
            avg_mood = sum(m.get('mood_score', 3) for m in moods) / len(moods)
            if avg_mood >= 4:
                achievements.append({
                    'icon': '🌟',
                    'title': 'Positive Vibes',
                    'description': 'Maintained high mood score!'
                })

        return achievements

    def _analyze_trends(self, workouts, meals, moods):
        trends = []

        if len(workouts) >= 3:
            trends.append({
                'type': 'positive',
                'text': f'💪 {len(workouts)} workouts completed — keep it up!'
            })
        elif len(workouts) == 0:
            trends.append({
                'type': 'negative',
                'text': '⚠️ No workouts logged — try to get moving!'
            })

        if meals:
            avg_cal = sum(m.get('calories_intake', 0) for m in meals) / len(meals)
            if avg_cal >= 1200:
                trends.append({
                    'type': 'positive',
                    'text': f'🥗 Averaging {round(avg_cal)} calories/day — good nutrition!'
                })

        if moods:
            avg_mood = sum(m.get('mood_score', 3) for m in moods) / len(moods)
            if avg_mood >= 3.5:
                trends.append({
                    'type': 'positive',
                    'text': f'😊 Average mood score: {round(avg_mood, 1)}/5 — feeling good!'
                })
            else:
                trends.append({
                    'type': 'warning',
                    'text': f'💙 Average mood score: {round(avg_mood, 1)}/5 — focus on wellness!'
                })

        return trends

    def _weekly_breakdown(self, workouts, meals, moods):
        breakdown = []
        today = datetime.now()

        for i in range(4):
            week_start = today - timedelta(days=(i + 1) * 7)
            week_end = today - timedelta(days=i * 7)

            week_workouts = [w for w in workouts
                           if self._in_range(w.get('date', ''), week_start, week_end)]
            week_meals = [m for m in meals
                        if self._in_range(m.get('date', ''), week_start, week_end)]
            week_moods = [m for m in moods
                        if self._in_range(m.get('date', ''), week_start, week_end)]

            avg_mood = 0
            if week_moods:
                avg_mood = sum(m.get('mood_score', 3) for m in week_moods) / len(week_moods)

            avg_cal = 0
            if week_meals:
                avg_cal = sum(m.get('calories_intake', 0) for m in week_meals) / len(week_meals)

            breakdown.append({
                'week': f'Week {4 - i}',
                'workouts': len(week_workouts),
                'avg_calories': round(avg_cal),
                'avg_mood': round(avg_mood, 1),
            })

        return list(reversed(breakdown))

    def _in_range(self, date_str, start, end):
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d')
            return start <= d <= end
        except:
            return False

    def _workout_message(self, count, calories):
        if count == 0:
            return 'No workouts logged. Start today!'
        elif count < 3:
            return f'{count} sessions logged. Aim for 3-4 per week!'
        else:
            return f'Great work! {count} sessions, {round(calories)} calories burned!'

    def _nutrition_message(self, avg_cal):
        if avg_cal == 0:
            return 'No meals logged yet.'
        elif avg_cal < 1200:
            return 'Calorie intake is low. Make sure to eat enough!'
        elif avg_cal > 2500:
            return 'Calorie intake is high. Monitor portion sizes.'
        else:
            return f'Good nutrition! Averaging {round(avg_cal)} calories/day.'

    def _mood_message(self, avg_score):
        if avg_score >= 4:
            return 'Excellent mood! Keep up the positive habits!'
        elif avg_score >= 3:
            return 'Mood is stable. Stay consistent!'
        else:
            return 'Mood has been low. Focus on self-care!'