'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { paymentAPI } from '@/lib/api';
import {
  Heart,
  TrendingUp,
  Calendar,
  DollarSign,
  Award,
  Sparkles,
  ArrowUpRight,
  Download,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Contribution {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    imageUrl?: string;
  };
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  isAnonymous: boolean;
  mpesaReceiptNumber?: string;
  paystackReference?: string;
  createdAt: string;
}

interface DashboardStats {
  totalContributions: number;
  totalAmount: number;
  campaignsSupported: number;
  averageContribution: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    totalAmount: 0,
    campaignsSupported: 0,
    averageContribution: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard');
      return;
    }
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, isLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response: any = await paymentAPI.getMyContributions();

      if (response.success) {
        const contributionsData = response.data.contributions || [];
        setContributions(contributionsData);

        // Calculate stats
        const totalAmount = contributionsData.reduce(
          (sum: number, c: Contribution) => sum + c.amount,
          0
        );
        const uniqueCampaigns = new Set(
          contributionsData.map((c: Contribution) => c.campaign._id)
        );

        setStats({
          totalContributions: contributionsData.length,
          totalAmount,
          campaignsSupported: uniqueCampaigns.size,
          averageContribution: contributionsData.length > 0 ? totalAmount / contributionsData.length : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success text-white';
      case 'pending':
        return 'bg-warning text-white';
      case 'failed':
        return 'bg-error text-white';
      default:
        return 'bg-muted';
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">My Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.name}! Track your giving impact.
              </p>
            </div>
            <Link href="/campaigns">
              <Button className="bg-primary hover:bg-primary-dark">
                <Heart className="w-5 h-5 mr-2" />
                Browse Campaigns
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Contributions */}
          <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">
              KES {stats.totalAmount.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Total Contributions</p>
          </Card>

          {/* Number of Donations */}
          <Card className="p-6 border-2 border-secondary/20 hover:border-secondary/40 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-secondary/10 rounded-xl">
                <Heart className="w-6 h-6 text-secondary" />
              </div>
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="text-3xl font-bold text-secondary mb-1">
              {stats.totalContributions}
            </h3>
            <p className="text-sm text-muted-foreground">Donations Made</p>
          </Card>

          {/* Campaigns Supported */}
          <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <Award className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-3xl font-bold text-primary mb-1">
              {stats.campaignsSupported}
            </h3>
            <p className="text-sm text-muted-foreground">Campaigns Supported</p>
          </Card>

          {/* Average Contribution */}
          <Card className="p-6 border-2 border-secondary/20 hover:border-secondary/40 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-secondary/10 rounded-xl">
                <Calendar className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-secondary mb-1">
              KES {Math.round(stats.averageContribution).toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">Average Donation</p>
          </Card>
        </motion.div>

        {/* Donation History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-8 border-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-1">Donation History</h2>
                <p className="text-muted-foreground">
                  All your contributions to K3C campaigns
                </p>
              </div>
              <Button variant="outline" className="border-2 border-primary text-primary">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <Separator className="mb-6" />

            {contributions.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-muted/50 rounded-full mb-4">
                  <Heart className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No donations yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start making an impact by supporting a campaign
                </p>
                <Link href="/campaigns">
                  <Button className="bg-primary hover:bg-primary-dark">
                    Browse Campaigns
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {contributions.map((contribution, index) => (
                  <motion.div
                    key={contribution._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="p-5 hover:shadow-lg transition-all border-2 hover:border-primary/30">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left Section - Campaign Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="w-14 h-14 bg-primary/10">
                            {contribution.campaign.imageUrl ? (
                              <img
                                src={contribution.campaign.imageUrl}
                                alt={contribution.campaign.title}
                                className="object-cover"
                              />
                            ) : (
                              <Heart className="w-7 h-7 text-primary" />
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <Link
                              href={`/campaigns/${contribution.campaign._id}`}
                              className="font-bold text-lg hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              {contribution.campaign.title}
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <Badge className={getPaymentBadgeColor(contribution.paymentStatus)}>
                                {contribution.paymentStatus}
                              </Badge>
                              <Badge variant="outline" className="uppercase">
                                {contribution.paymentMethod}
                              </Badge>
                              {contribution.isAnonymous && (
                                <Badge variant="outline" className="bg-muted">
                                  Anonymous
                                </Badge>
                              )}
                            </div>
                            {(contribution.mpesaReceiptNumber || contribution.paystackReference) && (
                              <p className="text-xs text-muted-foreground mt-2 font-mono">
                                Receipt: {contribution.mpesaReceiptNumber || contribution.paystackReference}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(contribution.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {/* Right Section - Amount */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            KES {contribution.amount.toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(contribution.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Impact Message */}
        {contributions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="p-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">
                    Your Kingdom Impact
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You've made {stats.totalContributions} {stats.totalContributions === 1 ? 'contribution' : 'contributions'} totaling{' '}
                    <span className="font-bold text-primary">KES {stats.totalAmount.toLocaleString()}</span> to{' '}
                    {stats.campaignsSupported} {stats.campaignsSupported === 1 ? 'campaign' : 'campaigns'}.
                    Your generosity is transforming lives and building God's kingdom. Thank you for being a faithful giver!
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
