'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { paymentAPI } from '@/lib/api';
import {
  Heart,
  CheckCircle2,
  Sparkles,
  Home,
  Share2,
  Download,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export default function SuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const campaignId = params.id as string;
  const contributionId = searchParams.get('contributionId');
  const method = searchParams.get('method');

  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Trigger confetti on mount
    setTimeout(() => {
      triggerConfetti();
    }, 500);

    // Check payment status
    if (contributionId && method === 'mpesa') {
      checkMPESAStatus();
    } else {
      // For Paystack, we assume success if we reached this page
      setPaymentStatus('success');
    }
  }, []);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Gold confetti from left
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#D97706', '#F59E0B', '#FBBF24'],
      });

      // Burgundy confetti from right
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#6B1C1C', '#8B2323', '#A52A2A'],
      });
    }, 250);
  };

  const checkMPESAStatus = async () => {
    if (!contributionId) return;

    try {
      // Poll for status (in real app, use webhooks or more sophisticated polling)
      const checkStatus = async () => {
        try {
          const response: any = await paymentAPI.checkMPESAStatus(contributionId);
          if (response.success) {
            setPaymentDetails(response.data);
            if (response.data.paymentStatus === 'success') {
              setPaymentStatus('success');
              toast.success('Payment confirmed!');
            } else if (response.data.paymentStatus === 'failed') {
              setPaymentStatus('failed');
              toast.error('Payment failed');
            } else {
              // Still pending, check again
              setTimeout(checkStatus, 3000);
            }
          }
        } catch (error) {
          console.error('Status check failed:', error);
        }
      };

      await checkStatus();
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  if (paymentStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-6"
          >
            <Sparkles className="w-16 h-16 text-secondary" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Processing Your Donation</h2>
          <p className="text-muted-foreground mb-4">
            Please wait while we confirm your payment...
          </p>
          {method === 'mpesa' && (
            <p className="text-sm text-muted-foreground">
              If you haven't completed the MPESA transaction on your phone, please do so now.
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-error/5 via-background to-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <div className="inline-block p-4 bg-error/10 rounded-full mb-6">
            <svg className="w-16 h-16 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-error">Payment Failed</h2>
          <p className="text-muted-foreground mb-6">
            Unfortunately, your payment could not be processed. Please try again.
          </p>
          <div className="flex gap-3">
            <Link href={`/campaigns/${campaignId}/donate`} className="flex-1">
              <Button className="w-full bg-primary">Try Again</Button>
            </Link>
            <Link href={`/campaigns/${campaignId}`} className="flex-1">
              <Button variant="outline" className="w-full">Back to Campaign</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-success/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Success Card */}
          <Card className="p-12 text-center shadow-2xl border-2 border-success/20 mb-8">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-block mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-success/20 rounded-full animate-ping"></div>
                <div className="relative p-4 bg-success/10 rounded-full">
                  <CheckCircle2 className="w-20 h-20 text-success" />
                </div>
              </div>
            </motion.div>

            {/* Success Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
                Thank You! 🎉
              </h1>
              <p className="text-xl text-muted-foreground mb-2">
                Your generous donation has been received
              </p>
              <div className="inline-flex items-center gap-2 text-success font-semibold">
                <Sparkles className="w-5 h-5" />
                Making a Kingdom Impact
                <Sparkles className="w-5 h-5" />
              </div>
            </motion.div>

            <Separator className="my-8" />

            {/* Payment Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="max-w-md mx-auto"
            >
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    KES {paymentDetails?.amount?.toLocaleString() || '---'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <Badge className="bg-secondary text-white uppercase">
                    {method === 'mpesa' ? 'MPESA' : 'Card'}
                  </Badge>
                </div>

                {paymentDetails?.mpesaReceiptNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Receipt:</span>
                    <span className="font-mono font-semibold">
                      {paymentDetails.mpesaReceiptNumber}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="bg-success text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Confirmed
                  </Badge>
                </div>
              </div>
            </motion.div>

            <Separator className="my-8" />

            {/* Impact Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-primary/5 p-6 rounded-lg"
            >
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Your contribution is making a real difference in our community.
                Watch the campaign progress update in real-time!
              </p>
            </motion.div>
          </Card>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Link href={`/campaigns/${campaignId}`}>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-2 border-primary text-primary hover:bg-primary/10"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                View Progress
              </Button>
            </Link>

            <Link href="/campaigns">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-2"
              >
                <Heart className="w-5 h-5 mr-2" />
                Browse Campaigns
              </Button>
            </Link>

            <Link href="/">
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary-dark"
              >
                <Home className="w-5 h-5 mr-2" />
                Home
              </Button>
            </Link>
          </motion.div>

          {/* Social Share */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center mt-8"
          >
            <p className="text-muted-foreground mb-4">
              Help us reach more people
            </p>
            <Button variant="outline" className="border-2 border-secondary text-secondary">
              <Share2 className="w-4 h-4 mr-2" />
              Share this Campaign
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
