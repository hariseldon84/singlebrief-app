import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

interface TeamMember {
  name: string;
  email: string;
  designation: string;
  topics: string[];
}

interface MemberDetailsFormProps {
  members: TeamMember[];
  onUpdate: (members: TeamMember[]) => void;
}

export function MemberDetailsForm({ members, onUpdate }: MemberDetailsFormProps) {
  const addMember = () => {
    onUpdate([...members, { name: '', email: '', designation: '', topics: [] }]);
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string | string[]) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const removeMember = (index: number) => {
    onUpdate(members.filter((_, i) => i !== index));
  };

  const updateTopics = (index: number, topicsString: string) => {
    const topics = topicsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    updateMember(index, 'topics', topics);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-inter">Team Members with Details</Label>
        <Button type="button" onClick={addMember} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>
      
      {members.map((member, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Member {index + 1}</span>
            <Button
              type="button"
              onClick={() => removeMember(index)}
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Name</Label>
              <Input
                value={member.name}
                onChange={(e) => updateMember(index, 'name', e.target.value)}
                placeholder="John Doe"
                className="text-sm"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={member.email}
                onChange={(e) => updateMember(index, 'email', e.target.value)}
                placeholder="john@company.com"
                className="text-sm"
                required
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Designation</Label>
              <Input
                value={member.designation}
                onChange={(e) => updateMember(index, 'designation', e.target.value)}
                placeholder="Senior Developer"
                className="text-sm"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Topics/Expertise</Label>
              <Input
                value={member.topics.join(', ')}
                onChange={(e) => updateTopics(index, e.target.value)}
                placeholder="Technology, Backend, API"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      ))}
      
      {members.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No members added yet. Click "Add Member" to start.
        </div>
      )}
    </div>
  );
}