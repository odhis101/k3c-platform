'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { campaignAPI, paymentAPI, Campaign } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Heart,
  ArrowLeft,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const SUGGESTED_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

export default function DonatePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [amount, setAmount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response: any = await campaignAPI.getById(campaignId);
      setCampaign(response.data);
    } catch (error) {
      toast.error('Failed to load campaign');
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleMPESAPayment = async () => {
    if (!amount || parseFloat(amount) < 10) {
      toast.error('Minimum donation amount is KES 10');
      return;
    }

    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    // Validate guest information if not authenticated
    if (!isAuthenticated) {
      if (!guestName || !guestEmail) {
        toast.error('Please enter your name and email');
        return;
      }
    }

    setProcessing(true);

    try {
      const response: any = await paymentAPI.initiateMPESA({
        campaignId,
        amount: parseFloat(amount),
        phoneNumber,
        isAnonymous,
        guestName: isAuthenticated ? undefined : guestName,
        guestEmail: isAuthenticated ? undefined : guestEmail,
      });

      if (response.success) {
        toast.success('STK Push sent!', {
          description: 'Please check your phone and enter your MPESA PIN',
          duration: 10000,
        });

        // Redirect to success page with contribution ID
        router.push(`/campaigns/${campaignId}/success?contributionId=${response.data.contributionId}&method=mpesa`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment initiation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!amount || parseFloat(amount) < 10) {
      toast.error('Minimum donation amount is KES 10');
      return;
    }

    // Validate guest information if not authenticated
    if (!isAuthenticated) {
      if (!guestName || !guestEmail) {
        toast.error('Please enter your name and email');
        return;
      }
    }

    setProcessing(true);

    try {
      const response: any = await paymentAPI.initiatePaystack({
        campaignId,
        amount: parseFloat(amount),
        isAnonymous,
        guestName: isAuthenticated ? undefined : guestName,
        guestEmail: isAuthenticated ? undefined : guestEmail,
      });

      if (response.success) {
        // Redirect to Paystack payment page
        window.location.href = response.data.authorization_url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment initiation failed');
      setProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'mpesa') {
      handleMPESAPayment();
    } else {
      handleCardPayment();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 shadow-2xl border-2">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-4">
                <Heart className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary mb-2">Make a Donation</h1>
              <p className="text-muted-foreground">{campaign.title}</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Amount Selection */}
              <div className="mb-8">
                <Label className="text-lg font-semibold mb-4 block">Select Amount (KES)</Label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {SUGGESTED_AMOUNTS.map((suggestedAmount) => (
                    <Button
                      key={suggestedAmount}
                      type="button"
                      variant={amount === suggestedAmount.toString() ? 'default' : 'outline'}
                      className={amount === suggestedAmount.toString() ? 'bg-primary' : 'border-2'}
                      onClick={() => setAmount(suggestedAmount.toString())}
                    >
                      {suggestedAmount.toLocaleString()}
                    </Button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    KES
                  </span>
                  <Input
                    type="number"
                    placeholder="Custom amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                    className="pl-14 h-14 text-xl border-2 focus:border-primary"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Minimum: KES 10</p>
              </div>

              <Separator className="my-6" />

              {/* Guest Information */}
              {!isAuthenticated && (
                <>
                  <div className="mb-8 space-y-4">
                    <Label className="text-lg font-semibold block">Your Information</Label>
                    <div>
                      <Label htmlFor="guestName" className="mb-2 block">
                        Full Name *
                      </Label>
                      <Input
                        id="guestName"
                        type="text"
                        placeholder="John Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        className="h-12 border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestEmail" className="mb-2 block">
                        Email Address *
                      </Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        required
                        className="h-12 border-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        We'll send you a donation receipt
                      </p>
                    </div>
                  </div>

                  <Separator className="my-6" />
                </>
              )}

              {/* Payment Method */}
              <div className="mb-8">
                <Label className="text-lg font-semibold mb-4 block">Payment Method</Label>
                <Tabs
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as 'mpesa' | 'card')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 h-14">
                    <TabsTrigger value="mpesa" className="text-base">
                      <Smartphone className="w-5 h-5 mr-2" />
                      MPESA
                    </TabsTrigger>
                    <TabsTrigger value="card" className="text-base">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Card
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="mpesa" className="mt-6 space-y-4">
                    <Card className="p-4 bg-secondary/5 border-secondary/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-secondary mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold mb-1">MPESA Payment Process:</p>
                          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            <li>Enter your MPESA phone number</li>
                            <li>You'll receive an STK push on your phone</li>
                            <li>Enter your MPESA PIN to complete</li>
                          </ol>
                        </div>
                      </div>
                    </Card>

                    <div>
                      <Label htmlFor="phone" className="mb-2 block">
                        MPESA Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0703757369 or 254703757369"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="h-12 border-2"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="card" className="mt-6 space-y-4">
                    <Card className="p-4 bg-secondary/5 border-secondary/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold mb-1">Secure Card Payment:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>Powered by Paystack</li>
                            <li>Accepts Visa, Mastercard, and more</li>
                            <li>Secure and encrypted</li>
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <Separator className="my-6" />

              {/* Anonymous Option */}
              <div className="mb-8">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-primary text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Make this donation anonymous</span>
                </label>
                <p className="text-xs text-muted-foreground mt-2 ml-8">
                  Your name won't be displayed publicly
                </p>
              </div>

              {/* Summary */}
              <Card className="p-6 bg-muted/50 mb-6">
                <h3 className="font-bold mb-4">Donation Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">KES {amount || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <Badge className="bg-secondary">
                      {paymentMethod === 'mpesa' ? 'MPESA' : 'Card'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Display as:</span>
                    <span className="font-semibold">
                      {isAnonymous ? 'Anonymous' : (isAuthenticated ? user?.name : guestName || 'Guest')}
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">KES {amount || '0'}</span>
                  </div>
                </div>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={processing || !amount || parseFloat(amount) < 10}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-white text-lg font-bold"
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Complete Donation
                  </div>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
