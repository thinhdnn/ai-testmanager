'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Code, ChevronRight, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Fixture {
  id: string;
  name: string;
  type: string;
}

interface AddStepFormProps {
  onSubmit: (data: StepFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: StepFormData;
  title?: string;
  isFixture?: boolean; // Add isFixture prop to determine if we're in a fixture or test case
  fixtures?: Fixture[]; // Add fixtures prop to pass available fixtures
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
  title = 'Add New Step',
  isFixture = false,
  fixtures = []
}: AddStepFormProps) {
  const [formData, setFormData] = useState<StepFormData>(initialData);
  const [showPlaywrightScript, setShowPlaywrightScript] = useState(false);
  const [showFixtureSuggestions, setShowFixtureSuggestions] = useState(false);
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.action.trim()) {
      return; // Action is required
    }
    await onSubmit(formData);
  };

  // Watch for action input changes to show fixture suggestions for test cases
  useEffect(() => {
    // Only show fixture suggestions for test cases, not fixtures
    if (isFixture) {
      setShowFixtureSuggestions(false);
      return;
    }
    
    // Check if the action starts with "call" (case insensitive)
    if (formData.action.trim().toLowerCase().startsWith('call')) {
      // Filter fixtures based on what's after "call " if anything
      const searchTerm = formData.action.trim().substring(5).toLowerCase();
      
      const filtered = fixtures.filter(fixture => 
        searchTerm === '' || fixture.name.toLowerCase().includes(searchTerm)
      );
      
      setFilteredFixtures(filtered);
      setShowFixtureSuggestions(filtered.length > 0);
    } else {
      setShowFixtureSuggestions(false);
    }
  }, [formData.action, fixtures, isFixture]);

  // Handle selecting a fixture from suggestions
  const handleSelectFixture = (fixture: Fixture) => {
    setFormData({
      ...formData,
      action: `Call fixture: ${fixture.name}`,
      fixtureId: fixture.id
    });
    setShowFixtureSuggestions(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4 py-2">
        <div className="space-y-2 relative">
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
          
          {!isFixture && (
            <p className="text-xs text-muted-foreground mt-1">
              Type 'call' to add a fixture
            </p>
          )}
          
          {/* Fixture suggestions */}
          {showFixtureSuggestions && (
            <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
              <div className="p-2 text-xs text-muted-foreground border-b">
                Select a fixture:
              </div>
              <div className="py-1">
                {filteredFixtures.map((fixture) => (
                  <div
                    key={fixture.id}
                    className="px-4 py-2 text-sm hover:bg-muted cursor-pointer flex items-center"
                    onClick={() => handleSelectFixture(fixture)}
                  >
                    <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
                    {fixture.name}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {fixture.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
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