
from nutrition.models import BMRFormula, BMRGenderFormula, BMRActivityMultiplier

# Harris-Benedict multipliers (6)
harris_multipliers = [
    ("bed_bound", 1.2),
    ("seated_static", 1.45),
    ("seated_moving", 1.65),
    ("standing", 1.85),
    ("sport", 2.2),
    ("strenuous", 2.3),
]

# Mifflin-St Jeor multipliers (5)
mifflin_multipliers = [
    ("bed_bound", 1.2),
    ("seated_static", 1.375),
    ("seated_moving", 1.55),
    ("standing", 1.725),
    ("sport", 1.9),
    ("strenuous", 1.9),
]

# Create Harris-Benedict formula
harris = BMRFormula.objects.create(name="Harris-Benedict", description="Classic BMR formula.")
BMRGenderFormula.objects.create(
    formula=harris, gender='M',
    expression="88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)"
)
BMRGenderFormula.objects.create(
    formula=harris, gender='F',
    expression="447.593 + (9.247 * weight) + (3.098 * height) - (4.33 * age)"
)
for level, multiplier in harris_multipliers:
    BMRActivityMultiplier.objects.create(formula=harris, level=level, multiplier=multiplier)

# Create Mifflin-St Jeor formula
mifflin = BMRFormula.objects.create(name="Mifflin-St Jeor", description="Modern BMR formula.")
BMRGenderFormula.objects.create(
    formula=mifflin, gender='M',
    expression="(10 * weight) + (6.25 * height) - (5 * age) + 5"
)
BMRGenderFormula.objects.create(
    formula=mifflin, gender='F',
    expression="(10 * weight) + (6.25 * height) - (5 * age) - 161"
)
for level, multiplier in mifflin_multipliers:
    BMRActivityMultiplier.objects.create(formula=mifflin, level=level, multiplier=multiplier)
