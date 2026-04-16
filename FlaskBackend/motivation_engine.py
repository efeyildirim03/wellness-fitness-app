from datetime import datetime
import random

class MotivationEngine:

    def __init__(self):
        self.message_bank = self._build_message_bank()

    def _build_message_bank(self):
        return {
            'high_mood_active': [
                "🌟 You're on fire! Your positive energy and active lifestyle are a winning combination. Keep pushing!",
                "⚡ Amazing momentum! You're proving that consistency and positivity create unstoppable results!",
                "🏆 You're crushing it! High energy + regular workouts = the formula for success. Stay the course!",
                "💪 Your dedication is inspiring! Keep this incredible energy going — you're building lifelong habits!",
            ],
            'high_mood_inactive': [
                "😊 Great mood today! Channel that positive energy into a workout — even 20 minutes will feel amazing!",
                "🌈 You're feeling great — perfect time to start that workout you've been planning. Ride this wave!",
                "✨ Positive energy detected! Convert it into action today. Your future self will thank you!",
            ],
            'low_mood_active': [
                "💙 Even on tough days, you showed up. That's real strength. Be proud of every step forward.",
                "🌱 Tough days build character. The fact that you're still moving means you're stronger than you think.",
                "❤️ Your consistency through the hard days is what separates you. Rest if needed, but never quit.",
            ],
            'low_mood_inactive': [
                "💙 Feeling low is okay. Start small — a 10-minute walk can shift your mood significantly.",
                "🌸 Be gentle with yourself today. Even small steps count. How about a short stretch or walk?",
                "🤗 Your wellbeing matters most. Take care of yourself today — tomorrow you'll feel stronger.",
            ],
            'high_stress_good_sleep': [
                "🧘 Stress is high but your sleep is solid — that's your superpower right now. Use that rest to recharge.",
                "💪 Despite the pressure, you're recovering well. Keep protecting your sleep — it's your secret weapon.",
            ],
            'high_stress_poor_sleep': [
                "⚠️ High stress + poor sleep is a tough combo. Tonight, try: no screens 1hr before bed, deep breathing.",
                "🌙 Your body needs rest to handle stress. Prioritize sleep tonight — even 30 min extra makes a difference.",
            ],
            'goal_progress': [
                "🎯 Every logged workout and meal brings you closer to your goal. Small steps, big results!",
                "📈 Progress isn't always visible, but it's happening. Trust the process and keep going!",
                "🏅 Goals aren't achieved overnight. Your daily consistency is building the foundation for success!",
            ],
            'streak_motivation': [
                "🔥 You're building a streak! Momentum is everything — don't break the chain!",
                "⚡ Consistency is your superpower. Keep showing up every day!",
                "🌟 Each day you log is a vote for the person you're becoming. Keep voting!",
            ],
            'general': [
                "💪 Every workout counts. Every meal logged matters. You're building a healthier you!",
                "🌟 Small consistent actions create extraordinary results. Keep going!",
                "🎯 Focus on progress, not perfection. You're doing great!",
                "⚡ Your health is your greatest investment. Every effort pays dividends!",
            ]
        }

    def generate(self, data):
        """
        Generate mood-adjusted motivational message
        based on mood score, stress, sleep, workout data
        """
        mood_score = float(data.get('avgMoodScore', 3))
        stress_level = data.get('stressLevel', 'Low')
        sleep_quality = data.get('sleepQuality', 'Good')
        workout_count = data.get('workoutCount', 0)
        active_goals = data.get('activeGoals', [])

        # Determine message category based on data correlation
        category = self._determine_category(
            mood_score, stress_level, sleep_quality, workout_count
        )

        messages = self.message_bank.get(category, self.message_bank['general'])
        message = random.choice(messages)

        # Add goal-specific suffix if goals exist
        if active_goals and random.random() > 0.5:
            goal_messages = self.message_bank['goal_progress']
            message += ' ' + random.choice(goal_messages)

        # Generate time-appropriate greeting
        greeting = self._get_time_greeting()

        return {
            'message': message,
            'greeting': greeting,
            'category': category,
            'tone': self._get_tone(mood_score, stress_level),
            'timestamp': datetime.now().isoformat(),
        }

    def _determine_category(self, mood_score, stress_level, sleep_quality, workout_count):
        high_stress = stress_level in ['High', 'Very High']
        poor_sleep = sleep_quality in ['Poor', 'Fair']
        high_mood = mood_score >= 3.5
        active = workout_count >= 2

        if high_stress and poor_sleep:
            return 'high_stress_poor_sleep'
        elif high_stress and not poor_sleep:
            return 'high_stress_good_sleep'
        elif high_mood and active:
            return 'high_mood_active'
        elif high_mood and not active:
            return 'high_mood_inactive'
        elif not high_mood and active:
            return 'low_mood_active'
        elif not high_mood and not active:
            return 'low_mood_inactive'
        elif workout_count >= 3:
            return 'streak_motivation'
        else:
            return 'general'

    def _get_tone(self, mood_score, stress_level):
        if stress_level in ['High', 'Very High']:
            return 'supportive'
        elif mood_score >= 4:
            return 'energetic'
        elif mood_score >= 3:
            return 'encouraging'
        else:
            return 'gentle'

    def _get_time_greeting(self):
        hour = datetime.now().hour
        if 5 <= hour < 12:
            return 'Good morning! ☀️'
        elif 12 <= hour < 17:
            return 'Good afternoon! 🌤️'
        elif 17 <= hour < 21:
            return 'Good evening! 🌆'
        else:
            return 'Hey night owl! 🌙'