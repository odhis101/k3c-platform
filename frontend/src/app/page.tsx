'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Heart, Smartphone, TrendingUp, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/10 to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Logo/Church Name */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="mb-6">
                <img
                  src="/k3c-logo.png"
                  alt="K3C Church Logo"
                  className="h-32 w-auto mx-auto object-contain"
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">
                K3C Smart Giving
              </h1>
              <p className="text-lg text-muted-foreground">
                Loving God, Connecting People, Transforming Communities
              </p>
            </motion.div>

            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Give with <span className="text-primary">Purpose</span>,{' '}
                <span className="text-secondary">Impact</span> in Real-Time
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Experience a revolutionary way to give. Watch your contributions make an
                immediate impact through our gamified, QR-based platform.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 mb-16"
            >
              <Link href="/campaigns">
                <Button size="lg" className="bg-primary hover:bg-primary-dark text-white px-8 py-6 text-lg">
                  View Campaigns
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary text-primary hover:bg-primary/10 px-8 py-6 text-lg"
                >
                  Get Started
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose K3C Smart Giving?
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Modern technology meets generous hearts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
                  <div className="inline-block p-3 bg-primary/10 rounded-xl mb-4">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                Give Your Way
              </h3>
              <p className="text-lg text-muted-foreground">
                Multiple secure payment options for your convenience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-8 border-2 hover:border-secondary transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-secondary/10 rounded-xl">
                    <Smartphone className="w-8 h-8 text-secondary" />
                  </div>
                  <h4 className="text-2xl font-bold">MPESA</h4>
                </div>
                <p className="text-muted-foreground mb-4">
                  Quick and easy mobile money payments. Enter your phone number and approve on your device.
                </p>
                <div className="text-sm text-muted-foreground">
                  Paybill: <span className="font-semibold text-foreground">488700</span>
                </div>
              </Card>

              <Card className="p-8 border-2 hover:border-secondary transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-secondary/10 rounded-xl">
                    <svg className="w-8 h-8 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold">Card Payment</h4>
                </div>
                <p className="text-muted-foreground mb-4">
                  Secure card payments powered by Paystack. Visa, Mastercard, and more accepted.
                </p>
                <div className="text-sm text-muted-foreground">
                  Powered by <span className="font-semibold text-foreground">Paystack</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-primary-light to-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Make a Difference?
            </h3>
            <p className="text-xl text-white/90 mb-8">
              Join hundreds of donors making an impact every day
            </p>
            <Link href="/campaigns">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg">
                Start Giving Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h4 className="text-xl font-bold mb-2">Kilaleshwa Covenant Community Church</h4>
            <p className="text-muted-foreground mb-4">
              Living for the Glory of God & the Good of Others
            </p>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/campaigns" className="hover:text-primary">Campaigns</Link>
              <Link href="/auth/login" className="hover:text-primary">Login</Link>
              <Link href="/auth/register" className="hover:text-primary">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: TrendingUp,
    title: 'Real-Time Impact',
    description: 'Watch campaign progress update instantly as contributions come in. See your impact in real-time.',
  },
  {
    icon: Smartphone,
    title: 'Easy Mobile Giving',
    description: 'Give via MPESA with just your phone number. Quick, secure, and convenient.',
  },
  {
    icon: Zap,
    title: 'Instant Processing',
    description: 'Lightning-fast payment processing with immediate confirmation and receipts.',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Join a community of generous givers working together for Kingdom impact.',
  },
  {
    icon: Heart,
    title: 'Transparent Giving',
    description: 'Full transparency on how funds are used and campaign progress towards goals.',
  },
  {
    icon: Zap,
    title: 'Gamified Experience',
    description: 'Celebrate milestones together and see the collective impact of the church family.',
  },
];
