'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AddStepForm, StepFormData } from '@/components/step/add-step-form';

interface AddStepFormWrapperProps {
  projectId: string;
}

export function AddStepFormWrapper({ projectId }: AddStepFormWrapperProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (formData: StepFormData) => {
    try {
      setIsSubmitting(true);
      
      // This is just a demo, in a real application you would submit to the API
      console.log('Submitting step data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Step added successfully (demo)');
    } catch (error) {
      console.error('Error adding step:', error);
      toast.error('Failed to add step');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    toast.info('Add step cancelled');
  };
  
  return (
    <AddStepForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      title="Add Step (Demo)"
    />
  );
} 