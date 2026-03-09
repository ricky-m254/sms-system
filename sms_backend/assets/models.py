from django.db import models
from decimal import Decimal
from django.core.validators import MinValueValidator

class AssetCategory(models.Model):
    DEPRECIATION_METHOD_CHOICES = [
        ('none', 'None (No Depreciation)'),
        ('straight_line', 'Straight Line'),
        ('declining_balance', 'Declining Balance (200% / Double Declining)'),
    ]
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    depreciation_method = models.CharField(max_length=20, choices=DEPRECIATION_METHOD_CHOICES, default='none')
    useful_life_years = models.PositiveIntegerField(null=True, blank=True, help_text="Used for depreciation calculations")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.name)

class Asset(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('In Repair', 'In Repair'),
        ('Retired', 'Retired'),
        ('Disposed', 'Disposed'),
    ]
    name = models.CharField(max_length=200)
    asset_code = models.CharField(max_length=50, unique=True, blank=True)
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name='assets')
    purchase_date = models.DateField()
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    current_value = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    serial_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.asset_code} - {self.name}"

class AssetAssignment(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Returned', 'Returned'),
        ('Lost', 'Lost'),
        ('Damaged', 'Damaged'),
    ]
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
    assigned_to_employee = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True)
    assigned_to_student = models.ForeignKey('school.Student', on_delete=models.SET_NULL, null=True, blank=True)
    assigned_date = models.DateField()
    return_due_date = models.DateField(null=True, blank=True)
    return_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.asset.name} assigned to {self.assigned_to_employee or self.assigned_to_student}"

class AssetMaintenanceRecord(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=100) # e.g., Repair, Service, Inspection
    scheduled_date = models.DateField()
    completion_date = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    performed_by = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')

    def __str__(self):
        return f"{self.asset.name} - {self.maintenance_type} ({self.scheduled_date})"

class AssetDepreciation(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='depreciations')
    period_label = models.CharField(max_length=50) # e.g., "FY 2024" or "2024-Q1"
    depreciation_amount = models.DecimalField(max_digits=12, decimal_places=2)
    accumulated_depreciation = models.DecimalField(max_digits=12, decimal_places=2)
    net_book_value = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('asset', 'period_label')

    def __str__(self):
        return f"{self.asset.asset_code} - {self.period_label}"
