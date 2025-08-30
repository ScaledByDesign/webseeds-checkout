'use client'

import Image from 'next/image'
import Link from 'next/link'
import CountdownTimer from '@/components/CountdownTimer'
import { useState, useEffect } from 'react'

export default function OptionsPage() {
  const [isExpired, setIsExpired] = useState(false)
  const [showFAQ, setShowFAQ] = useState<number[]>([])

  const toggleFAQ = (index: number) => {
    setShowFAQ(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white py-4 border-b-2 border-gray-200 sticky top-0 z-50">
        <div className="container max-w-4xl">
          <div className="flex justify-between items-center">
            <Image className="w-32 md:w-40" src="/assets/images/Logo.svg" alt="Fitspresso" width={160} height={60} priority />
            <div className="text-right">
              <p className="text-red-600 font-bold text-sm md:text-base uppercase">DO NOT CLOSE THIS PAGE</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm md:text-base">Offer Expires in:</span>
                <CountdownTimer 
                  initialSeconds={900}
                  className="font-bold text-red-600"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-8 md:py-12">
          <div className="container max-w-4xl">
            <h1 className="text-3xl md:text-5xl font-bold text-center text-gray-900 mb-6">
              WAIT! Your Order Is NOT Complete...
            </h1>
            
            <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-4 mb-8 text-center">
              <p className="text-lg md:text-xl font-semibold">
                🎉 Congratulations! As a new customer, you qualify for our LOWEST price ever!
              </p>
            </div>

            <div className="text-lg md:text-xl text-gray-700 space-y-4">
              <p>Hi, my name is Sarah Johnson.</p>
              <p>
                I&apos;m writing you this short letter because in a few moments, you&apos;re going to complete your order for Fitspresso...
              </p>
              <p>
                And I think that&apos;s a great decision! With Fitspresso you made the right choice to support your weight loss journey and boost your metabolism naturally.
              </p>
              <p className="font-semibold text-xl">
                But before you complete your order, I have something very important to share with you...
              </p>
            </div>
          </div>
        </section>

        {/* Main Offer Section */}
        <section className="py-12 bg-white">
          <div className="container max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get An Additional <span className="text-green-600">87% OFF</span> Today Only!
              </h2>
              <p className="text-xl text-gray-700">
                Stock up and save on Fitspresso with these exclusive first-time customer prices
              </p>
            </div>

            {/* 12 Bottle Offer */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-8 mb-8 border-4 border-purple-500">
              <div className="text-center mb-6">
                <span className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold uppercase">
                  BEST VALUE - MOST POPULAR
                </span>
              </div>
              
              <div className="md:flex items-center justify-between gap-8">
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-3xl font-bold mb-4">12 Bottle Package</h3>
                  <p className="text-xl mb-4">6 Month Supply</p>
                  
                  <div className="mb-6">
                    <p className="text-gray-600 line-through text-lg">Normally $197 per bottle</p>
                    <p className="text-4xl font-bold text-purple-700">
                      Today: <span className="text-5xl">$24.75</span> per bottle
                    </p>
                    <p className="text-2xl text-green-600 font-bold">Save 87%</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 mb-6">
                    <p className="text-gray-600">Regular Price: <span className="line-through">$2,364</span></p>
                    <p className="text-3xl font-bold">Today&apos;s Price: <span className="text-purple-700">$297</span></p>
                  </div>

                  <Link 
                    href="/checkout?upgrade=12"
                    className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-colors"
                  >
                    Yes, Upgrade My Order! →
                  </Link>
                </div>
                
                <div className="mt-8 md:mt-0">
                  <Image 
                    src="/assets/images/6-bottles.png" 
                    alt="12 Bottles" 
                    width={300} 
                    height={300}
                    className="mx-auto"
                  />
                </div>
              </div>
            </div>

            {/* 6 Bottle Offer */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 mb-8 border-2 border-blue-400">
              <div className="md:flex items-center justify-between gap-8">
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-3xl font-bold mb-4">6 Bottle Package</h3>
                  <p className="text-xl mb-4">3 Month Supply</p>
                  
                  <div className="mb-6">
                    <p className="text-gray-600 line-through text-lg">Normally $197 per bottle</p>
                    <p className="text-4xl font-bold text-blue-700">
                      Today: <span className="text-5xl">$24</span> per bottle
                    </p>
                    <p className="text-2xl text-green-600 font-bold">Save 88%</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 mb-6">
                    <p className="text-gray-600">Regular Price: <span className="line-through">$1,182</span></p>
                    <p className="text-3xl font-bold">Today&apos;s Price: <span className="text-blue-700">$144</span></p>
                  </div>

                  <Link 
                    href="/checkout?upgrade=6"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-colors"
                  >
                    Yes, Upgrade My Order! →
                  </Link>
                </div>
                
                <div className="mt-8 md:mt-0">
                  <Image 
                    src="/assets/images/6-bottles.png" 
                    alt="6 Bottles" 
                    width={250} 
                    height={250}
                    className="mx-auto opacity-80"
                  />
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link 
                href="/checkout"
                className="text-gray-600 underline hover:text-gray-800 text-lg"
              >
                No thanks, I don&apos;t want to save extra money today
              </Link>
            </div>
          </div>
        </section>

        {/* Why Stock Up Section */}
        <section className="py-12 bg-gray-100">
          <div className="container max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Our Customers Stock Up
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold mb-2">Biggest Savings</h3>
                <p className="text-gray-600">
                  This is the lowest price we&apos;ve ever offered - save up to 88%!
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-xl font-bold mb-2">Better Results</h3>
                <p className="text-gray-600">
                  Studies show consistent use for 3-6 months delivers the best results
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-4xl mb-4">🚚</div>
                <h3 className="text-xl font-bold mb-2">Free Shipping</h3>
                <p className="text-gray-600">
                  Multi-bottle packages ship free and you won&apos;t run out
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 text-center">
              <p className="text-lg">
                <strong>Remember:</strong> This special pricing is only available to first-time customers 
                and will NOT be offered again!
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 bg-white">
          <div className="container max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Real Results From Real Customers
            </h2>

            <div className="space-y-8">
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <Image
                    src="/assets/images/olivia.png"
                    alt="Michael A"
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-bold text-lg mb-2">Michael A. - Lost 42 lbs</p>
                    <p className="text-gray-700 italic">
                      &quot;After just a few weeks on Fitspresso, my energy levels went through the roof. 
                      I barely feel hungry between meals anymore and the weight is melting off!&quot;
                    </p>
                    <div className="flex mt-2">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-yellow-500">★</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <Image
                    src="/assets/images/emily.png"
                    alt="Laura C"
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-bold text-lg mb-2">Laura C. - Lost 38 lbs</p>
                    <p className="text-gray-700 italic">
                      &quot;My metabolism has improved so much—I can finally enjoy life without 
                      constantly worrying about my weight.&quot;
                    </p>
                    <div className="flex mt-2">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-yellow-500">★</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <Image
                    src="/assets/images/olivia.png"
                    alt="James R"
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-bold text-lg mb-2">James R. - Lost 51 lbs</p>
                    <p className="text-gray-700 italic">
                      &quot;Fitspresso made a noticeable difference. My clothes fit better and 
                      I don&apos;t feel exhausted all the time anymore.&quot;
                    </p>
                    <div className="flex mt-2">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-yellow-500">★</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Guarantee Section */}
        <section className="py-12 bg-gradient-to-r from-green-50 to-green-100">
          <div className="container max-w-4xl">
            <div className="text-center">
              <Image
                src="/assets/images/money-back.png"
                alt="60 Day Guarantee"
                width={150}
                height={150}
                className="mx-auto mb-6"
              />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                No-Risk 60-Day 100% Money-Back Guarantee
              </h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Claim your bottles of Fitspresso, and if you don&apos;t see a remarkable improvement 
                in your weight and energy levels within 60 days, we&apos;ll refund every penny. 
                No questions asked. You have nothing to lose!
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 bg-white">
          <div className="container max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: "How does Fitspresso work?",
                  a: "Fitspresso contains a proprietary blend of natural ingredients that work together to boost your metabolism, increase energy levels, and support healthy weight loss. The formula helps your body burn fat more efficiently while reducing cravings."
                },
                {
                  q: "How many bottles should I order?",
                  a: "We recommend ordering at least 3-6 bottles to ensure you have enough supply to see significant results. Most of our customers order 6 bottles or more to take advantage of the discount and to share with family."
                },
                {
                  q: "Is this a one-time purchase?",
                  a: "Yes! This is a one-time purchase with no hidden fees or subscriptions. You&apos;ll never be billed again unless you place another order."
                },
                {
                  q: "How long does shipping take?",
                  a: "Your order will be shipped within 24 hours and typically arrives within 5-7 business days in the US. International orders may take 10-14 days."
                },
                {
                  q: "What if Fitspresso doesn&apos;t work for me?",
                  a: "We&apos;re confident you&apos;ll love Fitspresso, but if for any reason you&apos;re not satisfied, simply contact us within 60 days for a full refund. No questions asked!"
                }
              ].map((faq, index) => (
                <div key={index} className="border rounded-lg">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full text-left p-4 font-semibold text-lg flex justify-between items-center hover:bg-gray-50"
                  >
                    {faq.q}
                    <span className="text-2xl">{showFAQ.includes(index) ? '−' : '+'}</span>
                  </button>
                  {showFAQ.includes(index) && (
                    <div className="p-4 pt-0 text-gray-700">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 bg-gray-100">
          <div className="container max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Don&apos;t Miss Out On These Savings!
            </h2>
            <p className="text-xl text-gray-700 mb-8">
              Remember, this special pricing is only available right now on this page. 
              Once you leave, these prices expire forever.
            </p>
            
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
              <p className="text-lg font-semibold text-red-700">
                ⚠️ WARNING: Due to high demand, we cannot guarantee this special pricing 
                will be available tomorrow. Lock in your discount now!
              </p>
            </div>

            <div className="space-y-4">
              <Link 
                href="/checkout?upgrade=12"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-12 rounded-full text-2xl transition-colors"
              >
                Yes! Upgrade to 12 Bottles →
              </Link>
              <br />
              <Link 
                href="/checkout?upgrade=6"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-full text-xl transition-colors"
              >
                Upgrade to 6 Bottles →
              </Link>
              <br />
              <Link 
                href="/checkout"
                className="text-gray-600 underline hover:text-gray-800"
              >
                No thanks, I&apos;ll pay more later
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-white">
        <div className="container text-center">
          <p className="mb-4">© 2025 Fitspresso. All Rights Reserved.</p>
          <p className="text-sm text-gray-400 mb-4">
            * These statements have not been evaluated by the FDA. This product is not 
            intended to diagnose, treat, cure, or prevent any disease.
          </p>
          <div className="flex justify-center gap-6">
            <Link href="#" className="text-sm hover:underline">Privacy Policy</Link>
            <Link href="#" className="text-sm hover:underline">Terms & Conditions</Link>
            <Link href="#" className="text-sm hover:underline">Contact Support</Link>
          </div>
        </div>
      </footer>
    </>
  )
}