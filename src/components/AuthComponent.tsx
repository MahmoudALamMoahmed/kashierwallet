import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserIcon, Mail, Phone } from 'lucide-react';

interface AuthComponentProps {
  user: any;
  onAuthChange: () => void;
}

export const AuthComponent = ({ user, onAuthChange }: AuthComponentProps) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // إنشاء مستخدم guest تلقائياً
  const createGuestUser = async () => {
    try {
      setIsLoading(true);
      const guestEmail = `guest-${Date.now()}@techstore.app`;
      
      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: 'guest123456',
        options: {
          emailRedirectTo: undefined,
          data: {
            display_name: 'زائر',
            is_guest: true
          }
        }
      });

      if (error) {
        console.error('Guest signup error:', error);
        // إذا فشل التسجيل، نحاول تسجيل الدخول
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: guestEmail,
          password: 'guest123456'
        });
        
        if (signInError) {
          throw new Error('فشل في إنشاء حساب الزائر');
        }
      }

      toast({
        title: "مرحباً!",
        description: "تم إنشاء محفظتك بنجاح",
      });

      onAuthChange();
    } catch (error: any) {
      console.error('Error creating guest:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في إنشاء الحساب",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSignup = async () => {
    if (!email) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'temp123456',
        options: {
          data: {
            display_name: email.split('@')[0],
            phone: phone
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "تم إنشاء الحساب!",
        description: "مرحباً بك في متجرنا",
      });

      setShowAuthDialog(false);
      onAuthChange();
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "خطأ في التسجيل",
        description: error.message || "حدث خطأ في إنشاء الحساب",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك لاحقاً!",
    });
    onAuthChange();
  };

  useEffect(() => {
    // إنشاء مستخدم guest تلقائياً إذا لم يكن هناك مستخدم
    if (!user) {
      createGuestUser();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Button 
          onClick={() => setShowAuthDialog(true)}
          variant="outline"
          size="sm"
        >
          <UserIcon className="h-4 w-4 mr-2" />
          تسجيل دخول
        </Button>

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء حساب سريع</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رقم الهاتف (اختياري)</label>
                <Input
                  type="tel"
                  placeholder="01000000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={handleQuickSignup}
                disabled={isLoading || !email}
                className="w-full"
              >
                إنشاء حساب وبدء التسوق
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-muted-foreground">
        مرحباً، {user.user_metadata?.display_name || 'زائر'}
      </span>
      <Button 
        onClick={handleSignOut}
        variant="ghost"
        size="sm"
      >
        خروج
      </Button>
    </div>
  );
};