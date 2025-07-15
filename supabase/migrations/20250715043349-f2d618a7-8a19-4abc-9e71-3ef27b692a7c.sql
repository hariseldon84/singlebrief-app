-- Add designation and topics columns to teams table for enhanced team member structure
ALTER TABLE public.teams ADD COLUMN member_details JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the new structure
COMMENT ON COLUMN public.teams.member_details IS 'Array of objects containing member details: [{"name": "John Doe", "email": "john@company.com", "designation": "Senior Developer", "topics": ["Technology", "Backend"]}]';

-- Update existing teams to migrate members array to new structure
UPDATE public.teams 
SET member_details = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', '',
      'email', member,
      'designation', '',
      'topics', '[]'::jsonb
    )
  )
  FROM unnest(members) AS member
)
WHERE array_length(members, 1) > 0;