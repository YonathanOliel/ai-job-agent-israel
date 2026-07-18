import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'סוכן העבודה החכם | AI Job Agent Israel',
  description:
    'סוכן קריירה אישי מבוסס AI שמוצא עבורך את המשרות המתאימות ביותר בישראל, מדרג לפי סיכוי אמיתי להתקבל ומסביר כל התאמה.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
