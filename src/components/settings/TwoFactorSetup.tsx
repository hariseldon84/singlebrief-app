import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Shield } from "lucide-react";

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TwoFactorSetup({ open, onOpenChange, onSuccess }: TwoFactorSetupProps) {
  const [step, setStep] = useState(1); // 1: show QR, 2: verify code
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      generateSecret();
    }
  }, [open]);

  const generateSecret = () => {
    // Generate a simple secret for demo purposes
    // In a real app, you'd use a proper TOTP library
    const secret = Array.from({ length: 32 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
    ).join('');
    
    setSecret(secret);
    
    // Generate QR code URL (this would normally be done server-side)
    const user = supabase.auth.getUser();
    const qrUrl = `otpauth://totp/SingleBrief:user@example.com?secret=${secret}&issuer=SingleBrief`;
    setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`);
  };

  const verifyAndEnable2FA = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No user found");

      // Update profile with 2FA settings
      const { error } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: true,
          two_factor_secret: secret
        })
        .eq('user_id', user.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enable 2FA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSecret("");
    setQrCode("");
    setVerificationCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Setup Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Scan the QR code with your Google Authenticator app"
              : "Enter the 6-digit code from your authenticator app"
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid gap-4 py-4 text-center">
            <div className="mx-auto">
              {qrCode && (
                <img 
                  src={qrCode} 
                  alt="2FA QR Code"
                  className="border rounded-lg"
                />
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>1. Open Google Authenticator on your phone</p>
              <p>2. Tap the + button to add an account</p>
              <p>3. Scan this QR code</p>
            </div>
            <div className="text-xs bg-muted p-2 rounded font-mono break-all">
              Secret: {secret}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)}>
              I've Added the Account
            </Button>
          ) : (
            <Button
              onClick={verifyAndEnable2FA}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? "Verifying..." : "Enable 2FA"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}