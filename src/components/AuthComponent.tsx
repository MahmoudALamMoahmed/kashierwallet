import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserIcon, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuthComponentProps {
  user: any;
  onAuthChange: () => void;
}

export const AuthComponent = ({ user, onAuthChange }: AuthComponentProps) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // إنشاء مستخدم guest تلقائياً
  const createGuestUser = async () => {
    // لا نحتاج إنشاء guest تلقائياً بعد الآن
    // سيكون هناك صفحة login مخصصة
    return;
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast({
        title: "تم تسجيل الخروج",
        description: "نراك لاحقاً!",
      });
      onAuthChange();
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "خطأ في تسجيل الخروج",
        description: error.message || "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // لن ننشئ مستخدم guest تلقائياً
    // المستخدم سيحتاج للذهاب لصفحة /login
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Button 
          onClick={() => navigate('/login')}
          className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
          size="sm"
        >
          <UserIcon className="h-4 w-4 mr-2" />
          تسجيل الدخول
        </Button>
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