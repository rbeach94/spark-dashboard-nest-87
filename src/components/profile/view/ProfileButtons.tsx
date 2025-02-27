
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

interface ProfileButtonsProps {
  profile: Tables<"nfc_profiles">;
  buttons?: {
    id: string;
    label: string;
    action_type: string;
    action_value: string;
  }[];
}

export const ProfileButtons = ({ profile, buttons }: ProfileButtonsProps) => {
  const handleButtonClick = async (buttonId: string) => {
    // Record the button click
    console.log('Recording button click:', { buttonId, profileId: profile.id });
    const { error } = await supabase
      .from('profile_button_clicks')
      .insert({
        button_id: buttonId,
        profile_id: profile.id
      });

    if (error) {
      console.error('Error recording button click:', error);
    }
  };

  const getButtonUrl = (button: { action_type: string, action_value: string }) => {
    switch (button.action_type) {
      case 'link':
        return button.action_value;
      case 'email':
        return `mailto:${button.action_value}`;
      case 'call':
        return `tel:${button.action_value}`;
      default:
        return '#';
    }
  };

  return (
    <div className="space-y-4">
      {buttons?.map((button) => (
        <a
          key={button.id}
          href={getButtonUrl(button)}
          target={button.action_type === 'link' ? '_blank' : undefined}
          rel={button.action_type === 'link' ? 'noopener noreferrer' : undefined}
          className="block w-full"
          onClick={() => handleButtonClick(button.id)}
        >
          <Button
            className="w-full"
            style={{ 
              backgroundColor: profile.button_color || '#8899ac',
              color: profile.button_text_color || '#FFFFFF'
            }}
            type="button"
          >
            {button.label}
          </Button>
        </a>
      ))}
    </div>
  );
};
