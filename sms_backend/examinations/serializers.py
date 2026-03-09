from rest_framework import serializers
from .models import ExamSession, ExamPaper, ExamSeatAllocation, ExamResult, ExamGradeBoundary

class ExamSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = '__all__'

class ExamPaperSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_name = serializers.CharField(source='school_class.display_name', read_only=True)

    class Meta:
        model = ExamPaper
        fields = '__all__'

class ExamSeatAllocationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.first_name', read_only=True)

    class Meta:
        model = ExamSeatAllocation
        fields = '__all__'

class ExamResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.first_name', read_only=True)
    admission_number = serializers.CharField(source='student.admission_number', read_only=True)

    class Meta:
        model = ExamResult
        fields = '__all__'

class ExamGradeBoundarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamGradeBoundary
        fields = '__all__'
