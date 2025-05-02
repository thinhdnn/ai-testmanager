'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Code, ChevronRight } from 'lucide-react';

interface AddStepFormProps {
  onSubmit: (data: StepFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: StepFormData;
  title?: string;
}

export interface StepFormData {
  action: string;
  data: string;
  expected: string;
  playwrightScript: string;
  fixtureId?: string;
}

export function AddStepForm({ 
  onSubmit, 
  onCancel, 
  isSubmitting,
  initialData = { action: '', data: '', expected: '', playwrightScript: '' },
  title = 'Add New Step'
}: AddStepFormProps) {
  const [formData, setFormData] = useState<StepFormData>(initialData);
  const [showPlaywrightScript, setShowPlaywrightScript] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.action.trim()) {
      return; // Action is required
    }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <label htmlFor="action" className="text-sm font-medium">
            Action <span className="text-destructive">*</span>
          </label>
          <Input
            id="action"
            placeholder="Click the login button"
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="data" className="text-sm font-medium">
            Data
          </label>
          <Input
            id="data"
            placeholder="Username: admin, Password: password123"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="expected" className="text-sm font-medium">
            Expected Result
          </label>
          <Textarea
            id="expected"
            placeholder="User should be redirected to the dashboard"
            value={formData.expected}
            onChange={(e) => setFormData({ ...formData, expected: e.target.value })}
            rows={3}
          />
        </div>
        
        <div className="border border-border rounded-md">
          <Button
            type="button"
            variant="ghost"
            className="flex w-full justify-between p-3 font-medium"
            onClick={() => setShowPlaywrightScript(!showPlaywrightScript)}
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span>Playwright Script</span>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${showPlaywrightScript ? 'rotate-90' : ''}`} />
          </Button>
          
          {showPlaywrightScript && (
            <div className="p-3 pt-0">
              <Textarea
                id="playwrightScript"
                placeholder="await page.getByRole('button', { name: 'Login' }).click();"
                value={formData.playwrightScript}
                onChange={(e) => setFormData({ ...formData, playwrightScript: e.target.value })}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter Playwright code to be executed for this step
              </p>
            </div>
          )}
        </div>
      </div>
      
      <DialogFooter>
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting || !formData.action.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            title.startsWith('Add') ? 'Add Step' : 'Update Step'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
} 