'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { campaignAPI, Campaign } from '@/lib/api';
import { useCampaignUpdates } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Heart,
  TrendingUp,
  Calendar,
  Target,
  Users,
  Sparkles,
  ArrowLeft,
  Share2,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Contribution {
  amount: number;
  donorName?: string;
  isAnonymous: boolean;
  paymentMethod: string;
  timestamp: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentContributions, setRecentContributions] = useState<Contribution[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  // Real-time updates via Socket.IO
  useCampaignUpdates(
    campaignId,
    // On campaign update
    (data) => {
      console.log('Campaign updated:', data);
      if (campaign) {
        setCampaign({
          ...campaign,
          currentAmount: data.currentAmount || campaign.currentAmount || 0,
          completionPercentage: data.completionPercentage || campaign.completionPercentage || 0,
        });
      }
      if (data.newContribution?.amount) {
        toast.success('Campaign updated!', {
          description: `New contribution of KES ${data.newContribution.amount}`,
        });
      }
    },
    // On new contribution
    (data) => {
      console.log('New contribution:', data);
      const newContribution: Contribution = {
        amount: data.amount,
        donorName: data.donorName,
        isAnonymous: data.isAnonymous,
        paymentMethod: data.paymentMethod,
        timestamp: data.timestamp,
      };
      setRecentContributions((prev) => [newContribution, ...prev.slice(0, 9)]);
    },
    // On campaign completed
    (data) => {
      console.log('Campaign completed:', data);
      setShowCelebration(true);
      toast.success('🎉 Campaign Goal Reached!', {
        description: `This campaign has reached its goal of KES ${data.goalAmount.toLocaleString()}!`,
        duration: 10000,
      });
      setTimeout(() => setShowCelebration(false), 10000);
    }
  );

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response: any = await campaignAPI.getById(campaignId);
      setCampaign(response.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = () => {
    router.push(`/campaigns/${campaignId}/donate`);
  };

  if (loading) {
    return <CampaignSkeleton />;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Campaign not found</h2>
          <Link href="/campaigns">
            <Button>Back to Campaigns</Button>
          </Link>
        </div>
      </div>
    );
  }

  const completionPercentage = campaign.completionPercentage || 0;
  const currentAmount = campaign.currentAmount || 0;
  const goalAmount = campaign.goalAmount || 0;
  const remainingAmount = goalAmount - currentAmount;
  const daysLeft = campaign.endDate
    ? Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/5 to-background">
      {/* Celebration Confetti Effect */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="text-6xl">🎉🎊✨🙌</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <Link href="/campaigns" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Link>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden border-2">
                <div className="relative h-96 bg-gradient-to-br from-primary/20 to-secondary/20">
                  {campaign.imageUrl ? (
                    <img
                      src={campaign.imageUrl}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="w-32 h-32 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/90 text-primary border-0 font-semibold text-lg px-4 py-2">
                      {campaign.category}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Campaign Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="p-8 border-2">
                <h1 className="text-4xl font-bold mb-4 text-primary">{campaign.title}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {campaign.description}
                </p>

                <Separator className="my-6" />

                {/* Campaign Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold text-primary">
                      {completionPercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-2xl font-bold text-secondary">
                      {currentAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">KES Raised</div>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">
                      {remainingAmount > 0 ? remainingAmount.toLocaleString() : '0'}
                    </div>
                    <div className="text-sm text-muted-foreground">KES to Go</div>
                  </div>

                  {daysLeft !== null && daysLeft > 0 && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{daysLeft}</div>
                      <div className="text-sm text-muted-foreground">Days Left</div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Recent Contributions */}
            {recentContributions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="p-6 border-2">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-secondary" />
                    Recent Contributions
                  </h3>
                  <div className="space-y-3">
                    {recentContributions.map((contribution, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 bg-primary/20">
                            <Heart className="w-5 h-5 text-primary" />
                          </Avatar>
                          <div>
                            <div className="font-semibold">
                              {contribution.isAnonymous ? 'Anonymous' : contribution.donorName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(contribution.timestamp), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-secondary">
                            KES {contribution.amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {contribution.paymentMethod}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="sticky top-6 space-y-6"
            >
              {/* Progress Card */}
              <Card className="p-6 border-2 border-primary/20">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-3xl font-bold text-primary">
                        KES {currentAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-muted-foreground mb-4">
                      of KES {goalAmount.toLocaleString()} goal
                    </div>
                    <Progress value={completionPercentage} className="h-4" />
                  </div>

                  <Separator />

                  {/* Donate Button */}
                  <Button
                    onClick={handleDonate}
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-white text-lg h-14 font-bold"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Donate Now
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-2 border-primary text-primary hover:bg-primary/10"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share Campaign
                  </Button>
                </div>
              </Card>

              {/* Info Card */}
              <Card className="p-6 border-2">
                <h4 className="font-bold text-lg mb-4">Campaign Information</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="bg-success text-white">
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency</span>
                    <span className="font-semibold">{campaign.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-semibold">
                      {new Date(campaign.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  {campaign.endDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ends</span>
                      <span className="font-semibold">
                        {new Date(campaign.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CampaignSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/5 to-background">
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full" />
            <Card className="p-8">
              <Skeleton className="h-10 w-3/4 mb-4" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-2/3" />
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="p-6">
              <Skeleton className="h-40 w-full" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
