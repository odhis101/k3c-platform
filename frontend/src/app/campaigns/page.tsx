'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { campaignAPI, Campaign } from '@/lib/api';
import { Heart, TrendingUp, Calendar, ArrowRight, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response: any = await campaignAPI.getActive();
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || campaign.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(campaigns.map(c => c.category)));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/5 to-background">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary via-primary-light to-primary text-white py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="mb-6">
              <div className="inline-block bg-white/95 p-4 rounded-2xl">
                <img
                  src="/k3c-logo.png"
                  alt="K3C Church Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Active Campaigns</h1>
            <p className="text-xl text-white/90">
              Choose a cause close to your heart and make an impact today
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="container mx-auto px-4 -mt-8">
        <Card className="p-6 shadow-lg border-2">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-2"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? 'bg-primary' : ''}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? 'bg-primary' : ''}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Campaigns Grid */}
      <section className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-2 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-4 bg-muted rounded-full mb-4">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filters
            </p>
            <Button onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign, index) => (
              <CampaignCard key={campaign._id} campaign={campaign} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-secondary/10 to-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Want to create a campaign?</h3>
          <p className="text-lg text-muted-foreground mb-6">
            Contact the church admin to set up a new fundraising campaign
          </p>
          <Button size="lg" variant="outline" className="border-2 border-primary">
            Contact Admin
          </Button>
        </div>
      </section>
    </div>
  );
}

function CampaignCard({ campaign, index }: { campaign: Campaign; index: number }) {
  const completionPercentage = campaign.completionPercentage || 0;
  const daysLeft = campaign.endDate
    ? Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link href={`/campaigns/${campaign._id}`}>
        <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/30 overflow-hidden group cursor-pointer">
          {/* Image */}
          <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
            {campaign.imageUrl ? (
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Heart className="w-16 h-16 text-primary/40" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <Badge className="bg-white/90 text-primary border-0 font-semibold">
                {campaign.category}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {campaign.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {campaign.description}
            </p>

            {/* Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-primary">
                  KES {campaign.currentAmount.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  of KES {campaign.goalAmount.toLocaleString()}
                </span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {completionPercentage.toFixed(1)}% Complete
                </span>
                {daysLeft !== null && daysLeft > 0 && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {daysLeft} days left
                  </span>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <Button className="w-full bg-primary hover:bg-primary-dark group-hover:gap-3 transition-all">
              Give Now
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
