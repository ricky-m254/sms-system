from django.db import models
import uuid

class AssetCategory(models.Model):
    DEPRECIATION_CHOICES = [
        ('straight_line', 'Straight Line'),
        ('declining_balance', 'Declining Balance'),
        ('none', 'None'),
    ]
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    depreciation_method = models.CharField(max_length=20, choices=DEPRECIATION_CHOICES, default='none')
    useful_life_years = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Asset(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('In Repair', 'In Repair'),
        ('Retired', 'Retired'),
        ('Disposed', 'Disposed'),
    ]
    CONDITION_CHOICES = [
        ('Excellent', 'Excellent'),
        ('Good', 'Good'),
        ('Fair', 'Fair'),
        ('Poor', 'Poor'),
    ]
    asset_code = models.CharField(max_length=50, unique=True, editable=False)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(AssetCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='assets')
    description = models.TextField(blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    current_value = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='Good')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.asset_code} - {self.name}"

class AssetAssignment(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Returned', 'Returned'),
    ]
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
    assigned_to_name = models.CharField(max_length=200)
    assigned_by_name = models.CharField(max_length=200)
    assigned_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.asset.name} assigned to {self.assigned_to_name}"

class AssetDepreciation(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='depreciation_records')
    period_label = models.CharField(max_length=20, help_text="e.g. '2025' or '2025-Q1'")
    depreciation_amount = models.DecimalField(max_digits=14, decimal_places=2)
    accumulated_depreciation = models.DecimalField(max_digits=14, decimal_places=2)
    net_book_value = models.DecimalField(max_digits=14, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('asset', 'period_label')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.asset.name} — {self.period_label}: -{self.depreciation_amount}"


class AssetMaintenanceRecord(models.Model):
    MAINTENANCE_TYPE_CHOICES = [
        ('Preventive', 'Preventive'),
        ('Corrective', 'Corrective'),
        ('Emergency', 'Emergency'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
    ]
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPE_CHOICES)
    description = models.TextField()
    scheduled_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    technician_name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.maintenance_type} for {self.asset.name}"
