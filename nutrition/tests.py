from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Appointment, Calendar, CheckInLink, ClientProfile, DayLog, DietItem, DietPlan, FoodItem
from .scheduling import adherence, free_slots, phone_digits
from .services import ensure_tags

User = get_user_model()


def make_client(user, name='Ahmad Khalil', phone='0791234567'):
    return ClientProfile.objects.create(user=user, name=name, phone=phone, weight=90, height=178, age=34, gender='M',
                                        goal='loss', work_style='standing', bmr=1800, target_calories=2000)


def make_plan(client, meals=('meal1', 'meal2', 'meal3')):
    food = FoodItem.objects.create(name='rice', unit='100 g', protein=2.7, carb=28, fat=0.3, food_type='carb',
                                   multiplying_factor=100)
    tags = ensure_tags(list(meals))
    plan = DietPlan.objects.create(user=client.user, client=client, total_protein=10, total_carb=100, total_fat=5,
                                   meal_slots=[{'key': m, 'name': '', 'time': ''} for m in meals])
    item = DietItem.objects.create(plan=plan, food=food, category='carb', quantity=3, protein=8, carb=84, fat=1)
    item.tags.set(tags.values())
    return plan


class AppointmentsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='d@x.test', password='x', first_name='Yousef')
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.cal = self.api.get('/api/nutrition/calendars/').json()[0]  # a first calendar is made automatically

    def test_calendar_created_with_types(self):
        self.assertEqual(self.cal['name'], "Yousef's calendar")
        self.assertEqual(len(self.cal['types']), 4)

    def test_book_update_and_other_users_cannot_see(self):
        client = make_client(self.user)
        day = (timezone.localdate() + timedelta(days=7)).isoformat()
        r = self.api.post('/api/nutrition/appointments/', {'calendar': self.cal['id'], 'type': self.cal['types'][1]['id'],
                                                           'client': client.id, 'date': day, 'time': '11:30'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        a = r.json()
        self.assertEqual((a['minutes'], a['price'], a['name']), (30, 20.0, 'Ahmad Khalil'))
        r = self.api.put(f"/api/nutrition/appointments/{a['id']}/", {'status': 'attended', 'paid_via': 'cash'}, format='json')
        self.assertTrue(r.json()['paid'])
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='o@x.test', password='x'))
        self.assertEqual(other.get(f"/api/nutrition/appointments/{a['id']}/").status_code, 404)

    def test_public_booking_flow(self):
        cal = self.cal
        page = APIClient().get(f"/api/public/book/{cal['slug']}/").json()
        self.assertEqual(page['calendars'][0]['name'], cal['name'])
        self.assertFalse(page['calendars'][0]['pay_online'])  # no payment provider connected
        # find a working day in the next two weeks
        for i in range(1, 15):
            day = timezone.localdate() + timedelta(days=i)
            slots = APIClient().get(f"/api/public/book/{cal['slug']}/slots/",
                                    {'type': cal['types'][1]['id'], 'date': day.isoformat()}).json()['slots']
            if slots:
                break
        self.assertIn('10:00', slots)
        self.assertNotIn('13:00', slots)  # lunch break
        body = {'type': cal['types'][1]['id'], 'date': day.isoformat(), 'time': '10:00', 'name': 'Maya', 'phone': '0790001122'}
        self.assertEqual(APIClient().post(f"/api/public/book/{cal['slug']}/slots/", body, format='json').status_code, 201)
        self.assertEqual(APIClient().post(f"/api/public/book/{cal['slug']}/slots/", body, format='json').status_code, 409)
        a = Appointment.objects.get()
        self.assertEqual((a.source, a.pay_method, a.guest_name), ('booking_link', 'clinic', 'Maya'))

    def test_booking_matches_existing_client_by_phone(self):
        client = make_client(self.user, phone='+962 79 123 4567')
        cal = self.cal
        for i in range(1, 15):
            day = timezone.localdate() + timedelta(days=i)
            if free_slots(Calendar.objects.get(id=cal["id"]), day, 30):
                break
        r = APIClient().post(f"/api/public/book/{cal['slug']}/slots/", {
            'type': cal['types'][1]['id'], 'date': day.isoformat(), 'time': '10:00', 'name': 'A', 'phone': '0791234567'},
            format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Appointment.objects.get().client_id, client.id)

    def test_today_screen(self):
        client = make_client(self.user)
        today = timezone.localdate()
        Appointment.objects.create(calendar_id=self.cal['id'], client=client, date=today, time='10:00', price=20)
        Appointment.objects.create(calendar_id=self.cal['id'], client=client, date=today - timedelta(days=3),
                                   time='10:00', price=20, status='attended')
        r = self.api.get('/api/nutrition/today/', {'date': today.isoformat()}).json()
        self.assertEqual(len(r['appointments']), 1)
        self.assertEqual(r['unpaid_total'], 20.0)  # only the visit that already happened


class ClientAppTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='d@x.test', password='x')
        self.client_profile = make_client(self.user)
        make_plan(self.client_profile)
        self.token = CheckInLink.objects.create(client=self.client_profile).token

    def test_page_and_ticks(self):
        today = timezone.localdate()
        page = APIClient().get(f'/api/public/app/{self.token}/', {'date': today.isoformat()}).json()
        self.assertEqual([m['key'] for m in page['plan']['meals']], ['meal1', 'meal2', 'meal3'])
        self.assertIsNone(page['adherence'])
        r = APIClient().post(f'/api/public/app/{self.token}/', {'date': today.isoformat(), 'meals': {'meal1': 1, 'meal2': 0.5, 'x': 7},
                                                                 'water': 5}, format='json').json()
        self.assertEqual(r['meals'], {'meal1': 1.0, 'meal2': 0.5})
        self.assertEqual(r['water'], 5)
        self.assertEqual(r['adherence'], 50)  # 1.5 of 3 meals today

    def test_adherence_over_week(self):
        today = timezone.localdate()
        DietPlan.objects.filter(client=self.client_profile).update(created_at=timezone.now() - timedelta(days=30))
        for i in range(7):
            DayLog.objects.create(client=self.client_profile, date=today - timedelta(days=i),
                                  meals={'meal1': 1, 'meal2': 1} if i % 2 else {'meal1': 1, 'meal2': 1, 'meal3': 1})
        # 4 full days (3 meals) + 3 days with 2 meals = 18 of 21
        self.assertEqual(adherence(self.client_profile, today), 86)

    def test_switched_off_link(self):
        CheckInLink.objects.filter(token=self.token).update(active=False)
        self.assertEqual(APIClient().get(f'/api/public/app/{self.token}/').status_code, 404)

    def test_phone_digits(self):
        self.assertEqual(phone_digits('079 123 4567'), '962791234567')
        self.assertEqual(phone_digits('+962 79 123 4567'), '962791234567')
        self.assertEqual(phone_digits('00962791234567'), '962791234567')


class WorkoutSuggestionTests(TestCase):
    def setUp(self):
        from django.core.management import call_command
        call_command('add_academy_workouts', verbosity=0)
        self.user = User.objects.create_user(username='d@x.test', password='x')
        self.client_profile = make_client(self.user)  # goal: loss
        self.plan = make_plan(self.client_profile)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def interview(self, **answers):
        from .models import DetailedProfile
        DetailedProfile.objects.filter(client=self.client_profile).update(**answers)
        return self.api.get(f'/api/nutrition/plan/{self.plan.id}/workout-suggestions/').json()

    def test_trains_at_gym_intermediate(self):
        r = self.interview(exercise=True, exercise_place='Gym', exercise_level='Intermediate')
        self.assertEqual((r['profile']['place'], r['profile']['level']), ('gym', 'intermediate'))
        self.assertEqual(len(r['workouts']), 3)
        self.assertEqual(r['workouts'][0]['level'], 'intermediate')
        self.assertTrue(all(w['goal'] == 'fat_loss' for w in r['workouts']))
        self.assertEqual(r['workouts'][2]['place'], 'home')  # one home option

    def test_no_gym_but_home(self):
        r = self.interview(exercise=False, willing_gym=False, willing_home=True, exercise_level='Beginner')
        self.assertEqual(r['profile']['place'], 'home')
        self.assertEqual(r['workouts'][0]['place'], 'home')

    def test_does_not_want_to_train(self):
        r = self.interview(exercise=False, willing_gym=False, willing_home=False)
        self.assertIsNone(r['profile']['place'])
        self.assertEqual(r['workouts'], [])

    def test_change_and_skip_used(self):
        r = self.api.get(f'/api/nutrition/plan/{self.plan.id}/workout-suggestions/', {'goal': 'muscle_gain', 'level': 'advanced'}).json()
        self.assertEqual(r['workouts'][0]['level'], 'advanced')
        first = r['workouts'][0]['id']
        DietPlan.objects.filter(pk=self.plan.pk).update(workout_id=first)
        r = self.api.get(f'/api/nutrition/plan/{self.plan.id}/workout-suggestions/', {'goal': 'muscle_gain', 'level': 'advanced'}).json()
        self.assertNotIn(first, [w['id'] for w in r['workouts']])


class BloodTestTests(TestCase):
    def setUp(self):
        from django.core.management import call_command
        call_command('add_usda_foods', verbosity=0)
        call_command('add_food_micros', verbosity=0)
        self.user = User.objects.create_user(username='d@x.test', password='x')
        self.client_profile = make_client(self.user)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def test_save_advice_history_and_share(self):
        url = f'/api/nutrition/clients/{self.client_profile.id}/blood-tests/'
        old = {'date': '2026-03-01', 'results': [{'name': 'Ferritin', 'value': 22}, {'name': 'Vitamin D (25-OH)', 'value': 10}]}
        new = {'date': '2026-10-05', 'results': [
            {'name': 'Ferritin', 'value': 9, 'unit': 'ng/mL', 'ref_low': 15, 'ref_high': 150},
            {'name': 'Vitamin D', 'value': 16}, {'name': 'LDL cholesterol', 'value': 142},
            {'name': 'TSH', 'value': 6.2}, {'name': 'Some other test', 'value': 3}]}
        self.assertEqual(self.api.post(url, old, format='json').status_code, 201)
        r = self.api.post(url, new, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['low'], 2)
        page = self.api.get(url).json()
        codes = {a['code']: a for a in page['advice']}
        self.assertEqual(codes['ferritin']['status'], 'low')
        self.assertTrue(codes['ferritin']['foods'])
        self.assertTrue(codes['tsh']['refer'])  # thyroid -> doctor
        self.assertTrue(page['advice'][0]['refer'])  # 'refer to doctor' items come first
        hist = self.api.get(f'/api/nutrition/clients/{self.client_profile.id}/history/').json()
        ferritin = next(s for s in hist['blood'] if s['key'] == 'ferritin')
        self.assertEqual([p['value'] for p in ferritin['points']], [22, 9])
        self.assertTrue(any(s['key'] == 'weight' for s in hist['body']) or hist['body'] == [])
        # client sees nothing until shared
        token = CheckInLink.objects.create(client=self.client_profile).token
        self.assertIsNone(APIClient().get(f'/api/public/app/{token}/').json()['blood_advice'])
        self.api.put(f"/api/nutrition/blood-tests/{r.json()['id']}/", {'shared': True}, format='json')
        shared = APIClient().get(f'/api/public/app/{token}/').json()['blood_advice']
        self.assertEqual(shared['date'], '2026-10-05')

    def test_ai_read_fake(self):
        import os
        os.environ['AI_FAKE'] = 'true'
        self.user.plan_tier = 'pro'
        self.user.save()
        import base64
        r = self.api.post(f'/api/nutrition/clients/{self.client_profile.id}/blood-read/',
                          {'file': {'name': 'lab.png', 'content_type': 'image/png', 'data': base64.b64encode(b'x').decode()}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['results'][0]['code'], 'ferritin')

    def test_plan_micros(self):
        plan = make_plan(self.client_profile)  # 3 servings of a food without data
        r = self.api.get(f'/api/nutrition/plan/{plan.id}/micros/').json()
        iron = next(x for x in r['rows'] if x['key'] == 'iron_mg')
        self.assertEqual(iron['status'], 'low')
        self.assertTrue(iron['sources'])
        self.assertEqual(r['missing'], ['rice'])
