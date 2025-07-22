'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import CardUpdateModal from '../../../components/CardUpdateModal';
import './upsell.css';

export default function Upsell2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session');
  
  const [showDownsell, setShowDownsell] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showLastChanceModal, setShowLastChanceModal] = useState(false);
  const [showLastChance2Modal, setShowLastChance2Modal] = useState(false);
  const [countdown, setCountdown] = useState(100); // 1:40 in seconds
  const [loading, setLoading] = useState(false);
  
  // Error handling states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorType, setErrorType] = useState<'payment' | 'card' | 'network' | 'general'>('general');
  const [errorMessage, setErrorMessage] = useState('');
  const [originalErrorMessage, setOriginalErrorMessage] = useState('');
  const [showCardUpdateModal, setShowCardUpdateModal] = useState(false);
  const [retryProductCode, setRetryProductCode] = useState('');
  const [retryAmount, setRetryAmount] = useState(0);
  const [retryBottles, setRetryBottles] = useState(0);

  // Countdown timer for upsell
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Exit intent handler
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setShowExitModal(true);
        document.body.classList.add('fixed');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  // Check if session is valid
  useEffect(() => {
    if (!sessionId) {
      router.push('/checkout');
    } else {
      // Debug client-side cookies
      console.log('🍪 Client-side cookies:', document.cookie);
      console.log('🍪 Session ID from URL:', sessionId);
      
      // Make a test request to debug cookies
      fetch('/api/test-cookie', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
          console.log('🍪 Cookie test result:', data);
        })
        .catch(err => {
          console.error('🍪 Cookie test failed:', err);
        });
    }
  }, [sessionId, router]);

  // Handle upsell errors with user-friendly messages
  const handleUpsellError = (result: any, productCode: string, amount: number, bottles: number) => {
    const errorMsg = result.error || result.message || 'Payment processing failed';
    
    // Store retry information
    setRetryProductCode(productCode);
    setRetryAmount(amount);
    setRetryBottles(bottles);
    
    // Store the original error message
    setOriginalErrorMessage(errorMsg);
    
    // Determine error type based on error message
    if (errorMsg.toLowerCase().includes('card') || 
        errorMsg.toLowerCase().includes('payment method') ||
        errorMsg.toLowerCase().includes('declined') ||
        errorMsg.toLowerCase().includes('expired') ||
        errorMsg.toLowerCase().includes('insufficient') ||
        errorMsg.toLowerCase().includes('processing') ||
        errorMsg.toLowerCase().includes('upgrade') ||
        errorMsg.toLowerCase().includes('duplicate') ||
        errorMsg.toLowerCase().includes('transaction') ||
        errorMsg.toLowerCase().includes('refid')) {
      setErrorType('card');
      console.log('🔍 DEBUG - Set error type to: CARD - Going directly to card update modal');
      // Skip the error modal and go directly to card update modal
      setShowCardUpdateModal(true);
    } else if (errorMsg.toLowerCase().includes('vault') || 
               errorMsg.toLowerCase().includes('session')) {
      setErrorType('payment');
      setErrorMessage('Your payment session has expired.');
      console.log('🔍 DEBUG - Set error type to: PAYMENT');
      setShowErrorModal(true);
    } else {
      // Default to card error for better user experience
      setErrorType('card');
      console.log('🔍 DEBUG - Set error type to: CARD (default) - Going directly to card update modal');
      // Skip the error modal and go directly to card update modal
      setShowCardUpdateModal(true);
    }
  };

  // Handle retry after error
  const handleRetryPayment = () => {
    setShowErrorModal(false);
    if (retryProductCode) {
      handleUpsellPurchase(retryProductCode, retryAmount, retryBottles);
    }
  };

  // Handle card update request
  const handleUpdateCard = () => {
    setShowErrorModal(false);
    setShowCardUpdateModal(true);
  };

  // Handle successful card update
  const handleCardUpdateSuccess = () => {
    console.log('✅ Card update successful! Preparing to retry upsell...');
    console.log('🔄 Retry details:', {
      productCode: retryProductCode,
      amount: retryAmount,
      bottles: retryBottles,
      sessionId: sessionId
    });
    
    setShowCardUpdateModal(false);
    
    // Retry the original upsell purchase with a small delay to ensure new vault info is ready
    if (retryProductCode) {
      console.log('⏳ Waiting 1 second before retry to ensure vault update is propagated...');
      setTimeout(() => {
        console.log('🚀 Now retrying upsell purchase with updated payment method');
        handleUpsellPurchase(retryProductCode, retryAmount, retryBottles);
      }, 1000);
    } else {
      console.warn('⚠️ No retry product code available - cannot retry purchase');
    }
  };

  // Handle card update error
  const handleCardUpdateError = (message: string) => {
    console.error('❌ Card update failed:', message);
    // Keep the modal open and show the error
  };

  // Handle new checkout (go back to main checkout)
  const handleNewCheckout = () => {
    router.push('/checkout');
  };

  // Handle upsell purchase
  const handleUpsellPurchase = async (productCode: string, amount: number, bottles: number) => {
    if (!sessionId) {
      console.error('No session ID found in URL params');
      router.push('/checkout');
      return;
    }

    console.log('🎯 Processing upsell 2 purchase:', {
      sessionId,
      productCode,
      amount,
      bottles,
      step: 2
    });

    setLoading(true);

    try {
      const response = await fetch('/api/upsell/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Important for cookies
        body: JSON.stringify({
          sessionId,
          productCode,
          amount,
          bottles,
          step: 2,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to thank you page with upsell confirmation
        router.push(`/thankyou?session=${sessionId}&upsell=true&transaction=${result.transactionId}`);
      } else {
        console.error('Upsell failed:', result.error);
        handleUpsellError(result, productCode, amount, bottles);
      }
    } catch (error) {
      console.error('Upsell error:', error);
      setErrorType('network');
      setErrorMessage('We encountered a network issue while processing your upgrade.');
      setRetryProductCode(productCode);
      setRetryAmount(amount);
      setRetryBottles(bottles);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle decline upsell
  const handleDeclineUpsell = () => {
    if (!sessionId) {
      router.push('/checkout');
      return;
    }

    // Redirect to thank you page
    router.push(`/thankyou?session=${sessionId}`);
  };

  return (
    <>
      <div className="content is-size-4 is-size-4-touch">
        {/* Header */}
        <section className="section green-solid-background is-paddingless">
          <div className="container container-limit-u p-3 has-text-centered" style={{ fontSize: '0' }}>
            <Image src="/assets/upsells/shared/logo.svg" width={300} height={100} alt="Logo" priority style={{ width: 'auto', height: 'auto' }} />
          </div>
        </section>

        {/* Progress Bar */}
        <div className="has-background-grey-lighter">
          <div className="container container-limit-u">
            <div className="is-size-6 is-size-7-touch columns is-gapless is-uppercase has-text-centered">
              <div className="column">
                <div className="has-background-grey-lighter p-1 has-text-grey"><strong>✔ step 1</strong> order approved</div>
              </div>
              <div className="column">
                <div className="p-1 has-text-white" style={{ backgroundColor: '#29b700' }}><strong>✔ step 2</strong> product options</div>
              </div>
              <div className="column">
                <div className="has-background-grey-lighter p-1 has-text-grey"><strong>step 3</strong> final confirmation</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ borderBottom: '2px solid #aeaeae' }}></div>

        {!showDownsell ? (
          /* Main Upsell Section */
          <div className="upsell">
            <section className="section pt-2 pb-0">
              <div className="container container-limit-u">
                <p className="is-capitalized is-size-3 mt-2 mb-3 is-size-4-touch lh1 has-text-centered has-text-weight-bold lh1" style={{ color: 'red' }}>
                  Important Message!<br />Do Not Close This Page!
                </p>
                <p className="has-text-centered mb-4 lh1 is-hidden"><strong>Your Order Is Not Complete!</strong> Hit Play And Watch Video Below</p>
              </div>
            </section>

            {/* Video Section (Hidden) */}
            <section className="section m-0 is-hidden" style={{ padding: '0 30px' }}>
              <div className="container container-limit-u">
                <div className="vborder vborderBlue vid-type video-wrapper-mobile">
                  <div className="vid-padding vid-padding-mobile">
                    <div className="vid-wrapper">
                      <div className="vid-embed">
                        <div id="vidalytics_embed_"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section pt-2">
              <div className="container container-limit-u">
                {/* Author Box (Hidden) */}
                <div className="columns is-mobile is-variable is-1 is-vcentered author-box is-hidden" style={{ maxWidth: '600px', margin: '0 auto', display: 'none' }}>
                  <div className="column is-narrow">
                    <picture>
                      <Image src="/assets/upsells/shared/jim-cooper.webp" width={70} height={70} alt="" style={{ borderRadius: '34px', border: '#ccc solid 3px', width: 'auto', height: 'auto' }} />
                    </picture>
                  </div>
                  <div className="column">
                    <p className="mb-2 lh1 is-size-4 is-size-5-touch is-capitalized">Hey friend, Jim Cooper here, make sure you <strong>Hit PLAY Above Now</strong> as Your Order Is Not Complete Yet!</p>
                  </div>
                </div>

                {/* Main Offer */}
                <div className="upsell-hidden pt-4">
                  <p className="is-size-3 is-size-3-touch lh1 mb-2 is-capitalized has-text-centered" style={{ color: '#c71585' }}>
                    <strong>Click "Yes Upgrade My Order" below now</strong>
                  </p>
                  <p className="has-text-centered pb-4">
                    To claim your additional six-month supply of Sightagen (6 bottles) at this crazy <strong>'new customer only'</strong> discount and save $1,033 today!
                  </p>
                  <div className="has-text-centered pb-4 is-size-3 is-size-3-touch lh1">
                    <strong style={{ borderBottom: '4px solid red' }}>
                      Offer Expires in <span className="counter5" style={{ color: 'red' }}>{formatTime(countdown)}</span>
                    </strong>
                  </div>

                  {/* Product Box */}
                  <div className="box is-paddingless mb-6" style={{ border: '3px solid #0d3db8', background: '#fdfecf', borderRadius: '0' }}>
                    <div className="px-2 py-4 green-solid-background">
                      <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                        <strong>Sightagen 6 bottle Super Savings Bundle!</strong>
                      </p>
                    </div>
                    <div className="px-2 pt-4 pb-5">
                      <p className="has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch">
                        NORMALLY: <span style={{ color: '#c71585' }}>$197</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                        TODAY: <span style={{ color: 'green' }}>$24.83</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                        <picture>
                          <Image src="/assets/upsells/2/up-6.webp" width={270} height={350} style={{ maxWidth: '270px', width: '100%', height: 'auto' }} alt="" />
                        </picture>
                        <span className="save-badge">Save 87%</span>
                      </p>
                      <p className="mb-3 has-text-centered lh1">
                        <span className="savings">
                          Regular Price: <strong><span className="strikered"><span className="color_sav">$1,182</span></span></strong>
                        </span>
                      </p>
                      <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                        <strong>Today's Price: $149</strong>
                      </p>
                      <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                        <button 
                          onClick={() => handleUpsellPurchase('SA6_149', 149, 6)} 
                          disabled={loading}
                          className="lh1 yellow-button limit-button w100 accept-link"
                        >
                          {loading ? 'Processing...' : 'Yes! Upgrade My Order!'}
                        </button>
                      </p>
                      <div className="has-text-centered">
                        <picture>
                          <Image src="/assets/upsells/2/cards.png" width={220} height={70} style={{ width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                      </div>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                        <strong>✔ 60-Day MoneyBack Guarantee</strong>
                      </p>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                        <strong>✔ Free Shipping Included</strong>
                      </p>
                      <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                        <a 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowDownsell(true);
                          }}
                          className="lh1 limit-button flightPop" 
                          style={{ color: '#c71585' }}
                        >
                          <u>No thanks, continue to order confirmation. I understand I'll never see this again.</u>
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="has-text-weight-bold has-text-left is-size-2 is-size-3-touch lh1 headlineColor1 is-capitalized">Why are we doing this?</p>
                  <div className="pr-2 pb-2" style={{ float: 'left' }}>
                    <picture>
                      <Image src="/assets/upsells/shared/jim-cooper.webp" width={110} height={110} alt="" style={{ borderRadius: '12px', border: '#ccc solid 3px', width: 'auto', height: 'auto' }} />
                    </picture>
                  </div>
                  <p>Over the years I've worked with thousands of clients, helping them naturally enhance and support their vision health...</p>
                  <p>And in that time I've noticed something critically important...</p>
                  <p>Many of my clients with vision issues also had underlaying collagen production issues...</p>
                  <p>Even if they didn't wear glasses yet, many struggled with eye strain, fatigue, blurriness and dry eyes.</p>
                  <p>And I found that if I didn't address their collagen production, they would struggle to improve their visual health...</p>
                  <p>How can you know if your collagen may be low?</p>
                  <p>You may feel:</p>
                  <p>Tired or strained after reading or using screens</p>
                  <p>Blurry vision, especially at night</p>
                  <p>Dry, gritty, or irritated eyes</p>
                  <p>Brain fog and poor focus</p>
                  <p>Frequent rubbing, blinking, or squinting</p>
                  <p>Sound familiar?</p>
                  <p>If your eyes aren't getting the nutrients they need, you'll hinder and slow down your results with RetinaClear</p>
                  <p>You see, just like I found with my clients, when your eyes lack structural support like collagen, the lens, cornea, and retina become more vulnerable to strain, dryness, and irritation.</p>
                  <p>And we all know that poor eye hydration and collagen loss can lead to quicker vision decline, trouble seeing at night, and even long-term complications down the line.</p>
                  <p>That's not something I want for you—or any of my clients.</p>
                  <p>That's why I searched for years to find a solution that would be simple, all natural and that you could use at home...</p>
                  <p>So today, I couldn't be more excited to introduce you to Sightagen, the perfect partner to RetinaClear...</p>
                  <p>A collagen-based, nutrient-rich formula designed to support visual clarity, hydration, and overall eye comfort.</p>
                  <p>Just take 1 scoop of Sightagen a day to sharpen visual acuity, reduce blurry vision and improve clarity at night, support natural collagen production in the eyes, relieve dryness and eye strain, help protect long-term vision health</p>
                  <p>Imagine feeling more refreshed, able to focus longer without squinting or rubbing your eyes… enjoying screens or reading without fatigue… and seeing more clearly in dim light or at night.</p>
                  <p>All while feeling confident you're protecting your long-term eye health.</p>
                  <p>Not to mention saying goodbye to the worries about your declining vision once and for all. This is all possible when you just take a few seconds each day to add Sightagen to your daily regimen alongside RetinaClear</p>
                  <p>You know what to do. Add 6 more bottles of Sightagen to your order right now at a "family and friends" discount of just $24.83 per bottle before they cut off our ingredients supply - that's a huge 87% saving!</p>
                  <p>So, what's the catch?</p>
                  <p>Well, there isn't one.</p>
                  <p>By adding 6 bottles of Sightagen to your order, we save on the cost of processing and fulfillment - and we want to pass those savings on to you!</p>
                  <p>We've found that our customers who are serious about achieving their dream body NEVER want to miss a single day. That's why they stock up!</p>
                  <p>So you're getting all the incredible benefits of Sightagen—comfort, clarity, hydration, and visual focus—all for pennies a day.</p>
                  <p>This is an exclusive first time customer offer. Chances are, you may never get another chance to save 87% on Sightagen — and this offer will expire if you close this page.</p>

                  {/* Guarantee Section */}
                  <div className="columns is-vcentered">
                    <div className="column is-narrow pb-0 has-text-centered is-hidden-mobile">
                      <picture>
                        <Image src="/assets/upsells/shared/guarantee.jpg" width={200} height={200} alt="" style={{ width: 'auto', height: 'auto' }} />
                      </picture>
                    </div>
                    <div className="column">
                      <div className="is-hidden-tablet has-text-centered my-3">
                        <picture>
                          <Image src="/assets/upsells/shared/guarantee.jpg" width={160} height={160} alt="" style={{ width: 'auto', height: 'auto' }} />
                        </picture>
                      </div>
                      <p className="has-text-weight-bold has-text-left is-size-2 is-size-3-touch lh1 headlineColor1 is-capitalized">No-Risk 60-Day 100% Money-Back Guarantee</p>
                      <p>Claim your 6 bottles of Sightagen below, and if you don't see remarkable fat loss within 60 days, we'll refund every penny of your purchase. That's how confident we are you'll absolutely love it!</p>
                    </div>
                  </div>

                  <p>Keep in mind, this is a one-time offer for select customers. This discount will disappear once you leave this page!</p>
                  <p>Sightagen is not sold in stores or anywhere else online, and never will be. It's only available on this page—and this might be the last time you'll ever be able to order Sightagen again at this price. You must protect your vision now and well into the future.</p>
                  <p>If you have friends or family who struggle with dry eyes, blurry vision, or eye fatigue, this is the perfect time to grab Sightagen for them, too, at this heavily discounted rate.</p>
                  <p>Click the "YES UPGRADE MY ORDER" button below and add 6 bottles of Sightagen saving you a crazy $1,033, that's a full 6-month supply for only $24.83 per bottle + free shipping and handling!</p>
                  <p>See you on the next page,</p>
                  <div className="mb-6" style={{ width: '200px', height: '50px', display: 'inline-block' }}>
                    <Image src="/assets/upsells/shared/signature.png" width={200} height={50} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>

                  {/* Second CTA */}
                  <div className="has-text-centered pb-4 is-size-3 is-size-3-touch lh1">
                    <strong style={{ borderBottom: '4px solid red' }}>
                      Offer Expires in <span className="counter5" style={{ color: 'red' }}>{formatTime(countdown)}</span>
                    </strong>
                  </div>
                  <div className="box is-paddingless mb-6" style={{ border: '3px solid #0d3db8', background: '#fdfecf', borderRadius: '0' }}>
                    <div className="px-2 py-4 green-solid-background">
                      <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                        <strong>Sightagen 6 bottle Super Savings Bundle!</strong>
                      </p>
                    </div>
                    <div className="px-2 pt-4 pb-5">
                      <p className="has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch">
                        NORMALLY: <span style={{ color: '#c71585' }}>$197</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                        TODAY: <span style={{ color: 'green' }}>$24.83</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                        <picture>
                          <Image src="/assets/upsells/2/up-6.webp" width={270} height={350} style={{ maxWidth: '270px', width: '100%', height: 'auto' }} alt="" />
                        </picture>
                        <span className="save-badge">Save 87%</span>
                      </p>
                      <p className="mb-3 has-text-centered lh1">
                        <span className="savings">
                          Regular Price: <strong><span className="strikered"><span className="color_sav">$1,182</span></span></strong>
                        </span>
                      </p>
                      <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                        <strong>Today's Price: $149</strong>
                      </p>
                      <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                        <button 
                          onClick={() => handleUpsellPurchase('SA6_149', 149, 6)} 
                          disabled={loading}
                          className="lh1 yellow-button limit-button w100 accept-link"
                        >
                          {loading ? 'Processing...' : 'Yes! Upgrade My Order!'}
                        </button>
                      </p>
                      <div className="has-text-centered">
                        <picture>
                          <Image src="/assets/upsells/2/cards.png" width={220} height={70} style={{ width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                      </div>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                        <strong>✔ 60-Day MoneyBack Guarantee</strong>
                      </p>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                        <strong>✔ Free Shipping Included</strong>
                      </p>
                      <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                        <a 
                          onClick={() => handleUpsellPurchase('SA3_099', 99, 3)} 
                          className="lh1 limit-button flightPop" 
                          style={{ color: '#c71585' }}
                        >
                          <u>No thanks, continue to order confirmation. I understand I'll never see this again.</u>
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* Downsell Section */
          <section className="section pt-2">
            <div className="container container-limit-u">
              <div className="pt-3"></div>
              <div className="columns is-vcentered">
                <div className="column is-narrow pb-0 has-text-centered is-hidden-mobile">
                  <picture>
                    <Image src="/assets/upsells/shared/stop.png" width={100} height={100} alt="" style={{ width: 'auto', height: 'auto' }} />
                  </picture>
                </div>
                <div className="column">
                  <div className="is-hidden-tablet has-text-centered my-3">
                    <picture>
                      <Image src="/assets/upsells/shared/stop.png" width={120} height={120} alt="" style={{ width: 'auto', height: 'auto' }} />
                    </picture>
                  </div>
                  <p className="is-capitalized has-text-weight-bold thorn is-size-1 is-size-2-touch mb-2 lh1">
                    6 more bottles of Sightagen too many?
                  </p>
                  <p className="is-capitalized has-text-weight-bold is-size-2 is-size-3-touch has-text-black lh1">
                    How About Just 3 bottles With <u className="yellowunder">88% Discount?</u>
                  </p>
                </div>
              </div>
              
              <div className="has-text-centered pb-4 is-size-3 is-size-3-touch lh1">
                <strong style={{ borderBottom: '4px solid red' }}>
                  Offer Expires in <span className="counter6" style={{ color: 'red' }}>15:00</span>
                </strong>
              </div>
              
              <div className="box is-paddingless mb-6" style={{ border: '3px solid #0d3db8', background: '#fdfecf', borderRadius: '0' }}>
                <div className="px-2 py-4 green-solid-background">
                  <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                    <strong>Sightagen 3 bottle Ultra Discount!</strong>
                  </p>
                </div>
                <div className="px-2 pt-4 pb-5">
                  <p className="has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch">
                    NORMALLY: <span style={{ color: '#c71585' }}>$197</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                    TODAY: <span style={{ color: 'green' }}>$33</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                    <picture>
                      <Image src="/assets/upsells/2/down-3.webp" width={270} height={350} style={{ maxWidth: '270px', width: '100%', height: 'auto' }} alt="" />
                    </picture>
                    <span className="save-badge">Save 88%</span>
                  </p>
                  <p className="mb-3 has-text-centered lh1">
                    <span className="savings">
                      Regular Price: <strong><span className="strikered"><span className="color_sav">$591</span></span></strong>
                    </span>
                  </p>
                  <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                    <strong>Today's Price: $99</strong>
                  </p>
                  <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                    <button 
                      onClick={() => handleUpsellPurchase('SA3_099', 99, 3)} 
                      disabled={loading}
                      className="lh1 yellow-button limit-button w100 accept-link-downsell"
                    >
                      {loading ? 'Processing...' : 'Yes! Upgrade My Order!'}
                    </button>
                  </p>
                  <div className="has-text-centered">
                    <picture>
                      <img src="https://getretinaclear.com/options-bg/2/1/lib/img/cards.png" style={{ width: '60%', maxWidth: '220px' }} alt="" />
                    </picture>
                  </div>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                    <strong>✔ 60-Day MoneyBack Guarantee</strong>
                  </p>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                    <strong>✔ Free Shipping Included</strong>
                  </p>
                  <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                    <button 
                      onClick={handleDeclineUpsell} 
                      className="lh1 limit-button flightPop3 decline-link" 
                      style={{ color: '#c71585', background: 'none', border: 'none' }}
                    >
                      <u>No thanks, I understand I cannot return to this page or see this offer again.</u>
                    </button>
                  </p>
                </div>
              </div>
              
              <div className="pr-2 pb-2" style={{ float: 'left' }}>
                <picture>
                  <Image src="/assets/upsells/shared/jim-cooper.webp" width={110} height={110} alt="" style={{ borderRadius: '12px', border: '#ccc solid 3px', width: 'auto', height: 'auto' }} />
                </picture>
              </div>
              <p>Hey, it's Jim here again. Look, I really don't want you to leave this page empty handed.</p>
              <p>Getting our hands on the purest sources of Sightagen's powerful eye superblend that includes collagen supporting ingredients is getting harder and harder. <strong>I don't know how long we can keep production up for before we have to close shop.</strong></p>
              <p>So, we would like to give you <strong>one more chance</strong> to get our best discount on Sightagen.</p>
              <p>We have your 3 bottles reserved and waiting for you on this page.</p>
              <p>I'd hate to have to give them to someone else.</p>
              <p>Remember, this is also a one-time only offer.</p>
              <p><strong>Once you leave this page, we cannot show you this again — no matter what.</strong></p>
              <p>Click the yes button below to add a 3-month supply of Sightagen to your existing order for just <strong><u className="yellowunder">$33 per bottle!</u></strong> And we'll even ship this upgrade out to you for FREE as well!</p>
              <p>As always you can email me, at <strong><a href="mailto:support@getretinaclear.com">support@getretinaclear.com</a></strong> if you have any questions.</p>
              
              <p className="has-text-weight-bold has-text-left is-size-3 is-size-4-touch lh1 headlineColor1 is-capitalized">
                No-Risk 60-Day 100% Money-Back Guarantee
              </p>
              <p>Every single bottle of Sightagen comes with our personal <strong>60-day 100% money-back guarantee</strong>. If for any reason you're unsatisfied with your results, just return all bottles (even if empty) for a full, no questions asked refund. That's how confident we are you'll absolutely love it!</p>
              <p className="mb-1">See you on the next page,</p>
              <div className="pb-4" style={{ width: '200px', height: '50px', display: 'inline-block' }}>
                <Image src="/assets/upsells/shared/signature.png" width={200} height={50} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              
              <p className="is-size-3 is-size-3-touch lh1 pb-4 is-capitalized has-text-centered" style={{ color: '#c71585' }}>
                <strong>Click "Yes Upgrade My Order" below now</strong>
              </p>
              <div className="has-text-centered pb-4 is-size-3 is-size-3-touch lh1">
                <strong style={{ borderBottom: '4px solid red' }}>
                  Offer Expires in <span className="counter6" style={{ color: 'red' }}>15:00</span>
                </strong>
              </div>
              
              <div className="box is-paddingless mb-0" style={{ border: '3px solid #0d3db8', background: '#fdfecf', borderRadius: '0' }}>
                <div className="px-2 py-4 green-solid-background">
                  <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                    <strong>Sightagen 3 bottle Ultra Discount!</strong>
                  </p>
                </div>
                <div className="px-2 pt-4 pb-5">
                  <p className="has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch">
                    NORMALLY: <span style={{ color: '#c71585' }}>$197</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                    TODAY: <span style={{ color: 'green' }}>$33</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                    <picture>
                      <Image src="/assets/upsells/2/down-3.webp" width={270} height={350} style={{ maxWidth: '270px', width: '100%', height: 'auto' }} alt="" />
                    </picture>
                    <span className="save-badge">Save 88%</span>
                  </p>
                  <p className="mb-3 has-text-centered lh1">
                    <span className="savings">
                      Regular Price: <strong><span className="strikered"><span className="color_sav">$591</span></span></strong>
                    </span>
                  </p>
                  <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                    <strong>Today's Price: $99</strong>
                  </p>
                  <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                    <button 
                      onClick={() => handleUpsellPurchase('SA3_099', 99, 3)} 
                      disabled={loading}
                      className="lh1 yellow-button limit-button w100 accept-link-downsell"
                    >
                      {loading ? 'Processing...' : 'Yes! Upgrade My Order!'}
                    </button>
                  </p>
                  <div className="has-text-centered">
                    <picture>
                      <img src="https://getretinaclear.com/options-bg/2/1/lib/img/cards.png" style={{ width: '60%', maxWidth: '220px' }} alt="" />
                    </picture>
                  </div>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                    <strong>✔ 60-Day MoneyBack Guarantee</strong>
                  </p>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                    <strong>✔ Free Shipping Included</strong>
                  </p>
                  <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                    <button 
                      onClick={handleDeclineUpsell} 
                      className="lh1 limit-button flightPop3 decline-link" 
                      style={{ color: '#c71585', background: 'none', border: 'none' }}
                    >
                      <u>No thanks, I understand I cannot return to this page or see this offer again.</u>
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <section className="section green-solid-background is-size-5 footersect">
          <div className="section-footer">
            <div className="footer-nav-wrap">
              <a href="https://getretinaclear.com/info/privacy.html" target="_blank" className="footer-text-link">Privacy</a>
              <a href="https://getretinaclear.com/info/terms.html" target="_blank" className="footer-text-link">Terms & Conditions</a>
              <a href="https://getretinaclear.com/info/disclaimer.html" target="_blank" className="footer-text-link">Disclaimer</a>
              <a href="https://getretinaclear.com/info/returns" className="footer-text-link" target="_blank">Returns & Refunds</a>
              <a href="https://getretinaclear.com/info/contact" className="footer-text-link" target="_blank">Contact</a>
            </div>
            <div className="buygoods-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 307.15 76.86" className="buygoods-logo invert">
                <defs>
                  <style dangerouslySetInnerHTML={{__html: `@font-face{font-family:Ubuntu-Bold;src:url(data:application/font-woff;charset=utf-8;base64,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) format("woff");font-weight:700;font-style:normal}`}} />
                </defs>
                <text transform="translate(0 60.95)" fontSize="72" fontFamily="Ubuntu-Bold,Ubuntu" fontWeight="700" letterSpacing="-0.05em" fill="#">
                  b<tspan x="39.89" letterSpacing="-0.04em" y="0">u</tspan>
                  <tspan x="79.34" letterSpacing="-0.04em" y="0">y</tspan>
                  <tspan x="115.92" y="0">goods</tspan>
                </text>
                <path d="M162.67,69s29,17.24,68,0V65.57s-34,15.17-68,0Z" fill="#" />
              </svg>
              <div className="buygoods-text">
                BuyGoods is the retailer of this product. BuyGoods is a registered trademark of BuyGoods Inc., a Delaware corporation located at 1201 N Orange Street Suite #7223, Wilmington, DE, 19801, USA and used by permission. BuyGoods role as retailer does not constitute an endorsement, approval or review of this product or any claim, statement or opinion used in promotion of this product.
              </div>
            </div>
            <div className="footer-text">
              All statements and results presented on this website are for informational purposes only. They are not specific medical advice for any individual. Neither the website, nor product should substitute medical advice given by a certified health professional. If you have a health problem, or you have sensible allergies, are pregnant or diagnosed with chronic conditions, it is strongly recommended that you consult your doctor immediately and before taking any pills or supplements. Individual results may vary depending on the case. Copyright © 2023 RetinaClear. All Rights Reserved.
            </div>
            <div className="footer-text">
              The website's content and the product for sale is based upon the author's opinion and is provided solely on an "AS IS" and "AS AVAILABLE" basis. You should do your own research and confirm the information with other sources when searching for information regarding health issues and always review the information carefully with your professional health care provider before using any of the protocols presented on this website and/or in the product sold here. Neither buygoods nor the author are engaged in rendering medical or similar professional services or advice via this website or in the product, and the information provided is not intended to replace medical advice offered by a physician or other licensed healthcare provider. You should not construe buygoods's sale of this product as an endorsement by buygoods of the views expressed herein, or any warranty or guarantee of any strategy, recommendation, treatment, action, or application of advice made by the author of the product. Testimonials, case studies, and examples found on this page are results that have been forwarded to us by users of Sightagen products and related products, and may not reflect the typical purchaser's experience, may not apply to the average person and are not intended to represent or guarantee that anyone will achieve the same or similar Results.
            </div>
            <div className="footer-text">
              Statements on this website have not been evaluated by the Food and Drug Administration. Products are not intended to diagnose, treat, cure or prevent any disease. If you are pregnant, nursing, taking medication, or have a medical condition, consult your physician before using our products.
            </div>
          </div>
        </section>
      </div>

      {/* Scripts */}
      <Script 
        src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
        onLoad={() => {
          if (typeof window !== 'undefined' && (window as any).WebFont) {
            (window as any).WebFont.load({
              google: {
                families: ["Roboto:100,100italic,300,300italic,regular,italic,500,500italic,700,700italic,900,900italic","Bebas Neue:regular","Roboto Condensed:400,700"]
              }
            });
          }
        }}
      />

      {/* Exit Modal */}
      {showExitModal && (
        <div className="exit-pop">
          <div id="loadModal-exitpage">
            <div className="">
              <div className="has-text-weight-bold pb-0 mb-2 lh1 has-text-centered block-16 gtb"><span className="gt">WAIT!</span></div>
            </div>
            <p className="pb-1 mb-1 lh1 is-size-4 has-text-centered"><strong>Don't leave our website yet.</strong></p>
            <div className="has-text-centered lh1 mb-3">Your order is not complete.</div>
            <p className="has-text-centered mb-0 pb-0">
              <a 
                className="yellow-button lh1 closeit has-text-weight-bold inline-fix is-capitalized" 
                style={{ width: '100%', cursor: 'pointer' }} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowExitModal(false);
                  document.body.classList.remove('fixed');
                }}
              >
                I'm Ready To continue checkout
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Last Chance Modal */}
      {showLastChanceModal && (
        <div className="exit-pop">
          <div id="loadModal-lastchance">
            <p className="has-text-weight-bold is-size-2 mt-3 is-size-3-touch mb-2 has-text-centered lh1" style={{ color: '#c71585' }}>LAST CHANCE</p>
            <p className="has-text-weight-bold lh1 mb-2 is-size-4 has-text-centered">Add 6 bottles of Sightagen for the low pricing of just</p>
            <p className="has-text-weight-bold thorn is-size-2 is-size-3-touch mb-2 has-text-centered lh1">$24.83 per bottle</p>
            <p className="has-text-weight-bold lh1 mb-2 is-size-3 is-size-4-touch has-text-centered yellowunder">that's $0.80 a day!</p>
            <p className="lh1 mb-3 has-text-centered is-size-5">(with <strong>free shipping</strong> and protected by my <strong>60-day 100% money-back guarantee</strong>)</p>
            <p className="is-size-4 is-size-5-touch mb-1 has-text-weight-bold">
              <button onClick={() => handleUpsellPurchase('SA6_149', 149, 6)} disabled={loading} className="lh1 yellow-button w100 accept-link">{loading ? 'Processing...' : 'I Accept Upgrade For $149'}</button>
            </p>
            <p className="mb-1 has-text-centered is-size-6">- OR -</p>
            <p className="is-size-4 is-capitalized is-size-5-touch mb-4 has-text-weight-bold">
              <a href="#" className="lh1 upsell-button flightPop2 w100">I Decline This Offer</a>
            </p>
            <p className="lh1 is-size-6 mb-0"><strong>NOTE:</strong> If I decline, I understand this will be the last time I'll ever see this offer and to get Sightagen at this incredible discount. I fully understand the health implications of declining this offer and do not hold you, Jim Cooper responsible for this.</p>
          </div>
        </div>
      )}

      {/* Last Chance 2 Modal */}
      {showLastChance2Modal && (
        <div className="exit-pop">
          <div id="loadModal-lastchance2">
            <p className="has-text-weight-bold is-size-2 mt-3 is-size-3-touch mb-2 has-text-centered lh1" style={{ color: '#c71585' }}>VERY LAST CHANCE!</p>
            <p className="has-text-weight-bold lh1 mb-2 is-size-4 has-text-centered">Add 3 bottles of Sightagen for the low-pricing of just</p>
            <p className="has-text-weight-bold thorn is-size-2 is-size-3-touch mb-2 has-text-centered lh1">$33 per bottle</p>
            <p className="has-text-weight-bold lh1 mb-2 is-size-3 is-size-4-touch has-text-centered yellowunder">that's $0.77 a day!</p>
            <p className="lh1 mb-3 has-text-centered is-size-5">(with <strong>free shipping</strong> and protected by my <strong>60-day 100% money-back guarantee</strong>)</p>
            <p className="is-size-4 is-size-5-touch mb-1 has-text-weight-bold">
              <button onClick={() => handleUpsellPurchase('SA3_099', 99, 3)} disabled={loading} className="lh1 yellow-button w100 accept-link-downsell">{loading ? 'Processing...' : 'I Accept Upgrade For $99'}</button>
            </p>
            <p className="mb-1 has-text-centered is-size-6">- OR -</p>
            <p className="is-size-4 is-capitalized is-size-5-touch mb-4 has-text-weight-bold">
              <button onClick={handleDeclineUpsell} className="lh1 upsell-button w100">I Decline This Offer</button>
            </p>
            <p className="lh1 is-size-6 mb-0"><strong>NOTE:</strong> If I decline, I understand this will be <strong>the last time</strong> I'll ever see this offer and to get Sightagen at this incredible discount. I fully understand the health implications of declining this offer and do not hold you, Jim Cooper responsible for this.</p>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="exit-pop" style={{ zIndex: 10000 }}>
          <div id="loadModal-error" style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            {/* Header with error icon */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                <svg style={{ width: '30px', height: '30px', color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>
                {errorType === 'card' ? 'Payment Method Issue' : 
                 errorType === 'payment' ? 'Session Expired' : 
                 errorType === 'network' ? 'Connection Issue' : 
                 'Processing Error'}
              </h3>
              <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
                {errorMessage}
              </p>
            </div>

            {/* Error-specific content */}
            <div style={{ marginBottom: '25px' }}>
              {errorType === 'card' && (
                <div style={{ backgroundColor: '#fef3f2', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#991b1b', fontWeight: '500', marginBottom: '10px' }}>
                    Possible reasons:
                  </p>
                  <ul style={{ fontSize: '14px', color: '#991b1b', paddingLeft: '20px', margin: 0 }}>
                    <li>Card was declined by your bank</li>
                    <li>Insufficient funds available</li>
                    <li>Card has expired or been deactivated</li>
                    <li>Security hold placed by card issuer</li>
                  </ul>
                </div>
              )}

              {errorType === 'payment' && (
                <div style={{ backgroundColor: '#fef3f2', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#991b1b' }}>
                    Your secure payment session has expired for security reasons. You'll need to start a new checkout process.
                  </p>
                </div>
              )}

              {errorType === 'network' && (
                <div style={{ backgroundColor: '#fef3f2', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#991b1b' }}>
                    Please check your internet connection and try again. If the problem persists, the issue may be on our end.
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons - Combined for all error types */}
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              {/* Primary action - Update Payment Method for card errors, Try Again for others */}
              <button
                onClick={errorType === 'card' ? handleUpdateCard : handleRetryPayment}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                {errorType === 'card' ? 'Update Payment Method' : 'Try Again'}
              </button>
              
              {/* Secondary action - Try Again for card errors, or alternative actions */}
              {errorType === 'card' && (
                <button
                  onClick={handleRetryPayment}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Try Again with Same Card
                </button>
              )}
              
              {errorType === 'payment' && (
                <button
                  onClick={handleNewCheckout}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Start New Checkout
                </button>
              )}

              {/* Continue Shopping option for all error types */}
              <button
                onClick={() => setShowErrorModal(false)}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Continue Shopping
              </button>
            </div>

            {/* Support section */}
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <svg style={{ width: '16px', height: '16px', color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>Need Help?</span>
              </div>
              <p style={{ fontSize: '12px', color: '#1e40af', margin: 0 }}>
                Contact our support team at <strong>support@fitspresso.com</strong><br />
                or call <strong>1-800-XXX-XXXX</strong> for immediate assistance
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card Update Modal */}
      <CardUpdateModal
        isOpen={showCardUpdateModal}
        onClose={() => setShowCardUpdateModal(false)}
        sessionId={sessionId}
        onSuccess={handleCardUpdateSuccess}
        onError={handleCardUpdateError}
        errorMessage={originalErrorMessage}
      />
    </>
  );
}