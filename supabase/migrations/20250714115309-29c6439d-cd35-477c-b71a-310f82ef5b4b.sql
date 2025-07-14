-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  members TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create policies for teams
CREATE POLICY "Users can view their own teams" 
ON public.teams 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams" 
ON public.teams 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams" 
ON public.teams 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create brief templates table
CREATE TABLE public.brief_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on brief_templates
ALTER TABLE public.brief_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for brief_templates
CREATE POLICY "Users can view public and system templates" 
ON public.brief_templates 
FOR SELECT 
USING (is_public = true OR is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.brief_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own templates" 
ON public.brief_templates 
FOR UPDATE 
USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own templates" 
ON public.brief_templates 
FOR DELETE 
USING (auth.uid() = user_id AND is_system = false);

-- Create briefs table
CREATE TABLE public.briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'archived')),
  response_count INTEGER NOT NULL DEFAULT 0,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  synthesis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on briefs
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

-- Create policies for briefs
CREATE POLICY "Users can view their own briefs" 
ON public.briefs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own briefs" 
ON public.briefs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own briefs" 
ON public.briefs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own briefs" 
ON public.briefs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create responses table for individual conversations
CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  secure_token TEXT NOT NULL UNIQUE,
  conversation JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brief_id, recipient_email)
);

-- Enable RLS on responses
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Create policies for responses - public access via secure token
CREATE POLICY "Responses accessible via secure token" 
ON public.responses 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brief_templates_updated_at
BEFORE UPDATE ON public.brief_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_briefs_updated_at
BEFORE UPDATE ON public.briefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
BEFORE UPDATE ON public.responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert system templates
INSERT INTO public.brief_templates (name, description, prompt, is_system, is_public) VALUES
('Project Feedback', 'Gather feedback on project progress and blockers', 'I need your honest feedback on our current project. What''s working well? What challenges are you facing? What would help you be more effective?', true, true),
('Team Pulse Check', 'Check team morale and satisfaction', 'How are you feeling about your current workload and team dynamics? What''s energizing you? What''s draining you?', true, true),
('Strategic Planning Input', 'Collect strategic insights for planning', 'Looking ahead to next quarter, what opportunities do you see? What risks should we be aware of? What should be our top priorities?', true, true),
('Process Improvement', 'Identify process inefficiencies and improvements', 'Think about our current processes and workflows. What''s slowing us down? What could we change to work more efficiently?', true, true),
('Customer Insights', 'Gather customer-facing insights from the team', 'Based on your interactions with customers, what are you hearing? What pain points come up most often? What opportunities do you see?', true, true);