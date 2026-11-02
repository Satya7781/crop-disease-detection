from rest_framework import serializers
from .models import LeafImage

class LeafImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeafImage
        fields = '__all__'
        read_only_fields = ['user', 'predicted_label', 'confidence_score', 'date_uploaded']
