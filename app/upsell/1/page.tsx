'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import './upsell.css';

export default function Upsell1() {
  const [showDownsell, setShowDownsell] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showLastChanceModal, setShowLastChanceModal] = useState(false);
  const [showLastChance2Modal, setShowLastChance2Modal] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15:00 in seconds
  const [faqOpenStates, setFaqOpenStates] = useState<{ [key: number]: boolean }>({});

  // Countdown timer
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

  // Toggle FAQ items
  const toggleFAQ = (index: number) => {
    setFaqOpenStates(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
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
                    To claim your additional twelve-month supply of RetinaClear (12 bottles) at this crazy <strong>'new customer only'</strong>
                    <span className="aff-content" data-display="inline"> discount and save $2,067 today</span>!
                  </p>
                  <div className="aff-content has-text-centered pb-4 is-size-3 is-size-3-touch lh1" data-display="block">
                    <strong style={{ borderBottom: '4px solid red' }}>
                      Offer Expires in <span className="counter5" style={{ color: 'red' }}>{formatTime(countdown)}</span>
                    </strong>
                  </div>

                  {/* Product Box */}
                  <div className="box is-paddingless mb-6">
                    <div className="px-2 py-4 green-solid-background">
                      <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                        <strong>RetinaClear 12 Bottle Super Savings Bundle!</strong>
                      </p>
                    </div>
                    <div className="px-2 pt-4 pb-5">
                      <p className="has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch aff-content" data-display="block">
                        NORMALLY: <span style={{ color: '#c71585' }}>$197</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                        TODAY: <span style={{ color: 'green' }}>$24.75</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                        <picture>
                          <Image src="/assets/upsells/1/up-12.webp" width={270} height={350} style={{ maxWidth: '270px', width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                        <span className="aff-content save-badge" data-display="flex">Save 87%</span>
                      </p>
                      <p className="mb-3 has-text-centered lh1 aff-content" data-display="block">
                        <span className="savings">
                          Regular Price: <strong><span className="strikered"><span className="color_sav">$2,364</span></span></strong>
                        </span>
                      </p>
                      <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                        <strong>Today's Price: $297</strong>
                      </p>
                      <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                        <a 
                          href="https://buygoods.com/secure/upsell?account_id=10751&product_codename=2_RC12_297" 
                          className="lh1 yellow-button limit-button w100 accept-link"
                        >
                          Yes! Upgrade My Order!
                        </a>
                      </p>
                      <div className="has-text-centered">
                        <picture>
                          <Image src="/assets/upsells/1/cards.png" width={220} height={70} style={{ width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                      </div>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                        <strong>✔ 60-Day Money-Back Guarantee</strong>
                      </p>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                        <strong>✔ Free Shipping Included</strong>
                      </p>
                      <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                        <a 
                          href="https://getretinaclear.com/options-bg/2/2/" 
                          className="lh1 limit-button flightPop accept-link-downsell" 
                          style={{ color: '#c71585' }}
                        >
                          <u>No thanks, continue to order confirmation. I understand I'll never see this again.</u>
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* 97% Customers Upgrade Text */}
                  <p className="has-text-weight-bold has-text-left is-size-2 is-size-3-touch lh1 headlineColor1 is-capitalized aff-content" data-display="block">
                    97% of customers upgrade on this page!
                  </p>

                  {/* Customer Testimonials - First Set */}
                  <div className="columns mb-5 aff-content" data-display="flex">
                    <div className="column">
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-6.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            After just a few weeks on Retina Clear, my blurry vision cleared up. I barely reach for my reading glasses anymore—my eyes feel refreshed and more focused every single day.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>Michael A</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-7.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            I was skeptical, but my night vision has improved so much—I can finally drive at night without fear. Headlights don't blind me anymore, and I feel way more confident on the road.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>Laura C</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                    </div>
                    <div className="column">
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-8.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            Retina Clear made a noticeable difference. Text looks sharper and I don't squint at my screen anymore. I can work longer hours without getting tired or straining my eyes.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>James R</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-9.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            I used to fumble with my glasses constantly. Now I forget where they are because I don't need them most days. My vision feels stable, sharper, and more natural overall.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>Michelle F</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Why are we doing this section */}
                  <p className="has-text-weight-bold has-text-left is-size-2 is-size-3-touch lh1 headlineColor1 is-capitalized">Why are we doing this?</p>
                  <div className="pr-2 pb-2" style={{ float: 'left' }}>
                    <picture>
                      <Image src="/assets/upsells/shared/jim-cooper.webp" width={110} height={110} alt="" style={{ borderRadius: '12px', border: '#ccc solid 3px', width: 'auto', height: 'auto' }} />
                    </picture>
                  </div>
                  <p>Jim here! The second you start taking RetinaClear, you'll quickly realize how great it feels to finally be making a positive change in your eye health and quality of life.</p>
                  <p>You'll feel a wave of relief and hope as your <strong>vision begins to clear,</strong> and your eyes finally get the support they need—each day bringing a noticeable improvement in sharpness, comfort, and confidence.</p>
                  <p><strong>You won't want to miss a single day of this.</strong> Once you experience the difference RetinaClear can make in reducing blurriness and supporting your aging eyes, you'll never want to go without it.</p>
                  <p>But you've also seen the news, there is constant talk of wars, economic troubles and trade relations falling apart and prices rising even higher.</p>
                  <p>To be honest, it has us worried. We're committed to sourcing only the highest-quality forms of proprietary ingredients used in RetinaClear...</p>
                  <p>And if trade relations suddenly cut off, that means our entire product could be on pause until the situation is resolved.</p>
                  <p className="aff-content" data-display="block">So you never miss out on this powerful vision support — even if we temporarily run out of stock — I'm inviting you to add an extra supply of RetinaClear to today's order at a <strong>MASSIVE one-time discount</strong>, saving you <strong>87%</strong> off retail!</p>
                  <p>Today is <strong>the most important day</strong> to stock up on RetinaClear and secure your eye health for the long run.</p>
                  <p>I really don't want you to be disappointed if you don't stock up now, only to come back later to find we're out of stock completely.</p>
                  <p className="aff-content has-text-weight-bold has-text-left is-size-2 is-size-3-touch lh1 headlineColor1 is-capitalized" data-display="block">What Happens If You stop Taking RetinaClear?</p>
                  <p className="aff-content" data-display="block"><strong>Missing just one day of RetinaClear's powerful vision-supporting nutrients can slow your progress and set your eyes back more than you'd think.</strong></p>
                  <p className="aff-content" data-display="block">That clearer, sharper vision you've been working toward can begin to fade—blurriness may creep back in, night driving can become more difficult, and the eye strain you thought was gone could return fast. The comfort, clarity, and visual confidence you've regained might slip away in just days without consistent support.</p>
                  <p className="aff-content" data-display="block">That's why taking RetinaClear daily is so important—your eyes need that steady, ongoing nourishment to thrive.</p>
                  <p>Can you imagine running out of RetinaClear, knowing your progress may reverse, and having to wait weeks to get back on track?</p>
                  <p>You know what to do. <strong>Add 12 more bottles of RetinaClear to your order right now</strong> at <span className="aff-content" data-display="inline">a "family and friends" discount of</span> just <strong>$24.75</strong> per bottle <span className="aff-content" data-display="inline">before they cut off our ingredients supply - that's a huge <strong>87%</strong> saving!</span></p>
                  <p className="has-text-weight-bold has-text-left is-size-2 is-size-3-touch lh1 headlineColor1 is-capitalized">So, what's the catch?</p>
                  <p>Well, there isn't one.</p>
                  <p>By adding 12 bottles of RetinaClear to your order, we save on the cost of processing and fulfillment - and we want to pass those savings on to you!</p>
                  <p>We've found that our customers who are serious about achieving their <strong>crystal-clear 20/20 vision </strong>NEVER want to miss a single day. That's why they stock up!</p>
                  <p>So you get all the incredible benefits of RetinaClear—sharper vision, reduced blurriness, better night vision, less eye strain, and greater visual comfort—all for just pennies a day.</p>
                  <p className="aff-content" data-display="block">This is an exclusive <strong>first time customer</strong> offer. Chances are, you may never get another chance to save <strong>87%</strong> on RetinaClear — and this offer will expire if you close this page.</p>
                  
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
                      <p>Claim your 12 bottles of RetinaClear below, and if you don't see a remarkable improvement in your eye health within 60 days, we'll refund every penny of your purchase. That's how confident we are you'll absolutely love it!</p>
                    </div>
                  </div>

                  <p className="aff-content" data-display="block">Keep in mind, this is a one-time offer for select customers. This discount will disappear once you leave this page!</p>
                  <p className="aff-content" data-display="block">RetinaClear is not sold in stores or elsewhere online and never will be. It is only available for purchase on this page ONLY. In fact, this is the <strong>very last time</strong> you'll be able to buy RetinaClear before your checkout is complete — you must protect your eye health now and well into the future.</p>
                  <p className="aff-content" data-display="block">And if you have friends or family who struggle with vision problems this is the perfect time to grab RetinaClear for them at this massively discounted rate as well.</p>
                  <p>Click the "YES UPGRADE MY ORDER" button below and add 12 bottles of RetinaClear <span className="aff-content" data-display="inline">saving you a crazy <strong>$2,067</strong></span>, that's a full 12-month supply for only <strong><u className="yellowunder">$24.75 per bottle</u></strong> + <strong>free shipping and handling</strong>!</p>
                  <p className="mb-1">See you on the next page,</p>
                  <div className="mb-6" style={{ width: '200px', height: '50px', display: 'inline-block' }}>
                    <Image src="/assets/upsells/shared/signature.png" width={200} height={50} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>

                  {/* Second Product Offer */}
                  <div className="aff-content has-text-centered pb-4 is-size-3 is-size-3-touch lh1" data-display="block">
                    <strong style={{ borderBottom: '4px solid red' }}>
                      Offer Expires in <span className="counter5" style={{ color: 'red' }}>{formatTime(countdown)}</span>
                    </strong>
                  </div>
                  <div className="box is-paddingless mb-6" style={{}}>
                    <div className="px-2 py-4 green-solid-background">
                      <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                        <strong>RetinaClear 12 Bottle Super Savings Bundle!</strong>
                      </p>
                    </div>
                    <div className="px-2 pt-4 pb-5">
                      <p className="aff-content has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch" data-display="block">
                        NORMALLY: <span style={{ color: '#c71585' }} data-display="block">$197</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                        TODAY: <span style={{ color: 'green' }}>$24.75</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                        <picture>
                          <Image src="/assets/upsells/1/up-12.webp" width={270} height={350} style={{ maxWidth: '270px', width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                        <span className="aff-content save-badge" data-display="flex">Save 87%</span>
                      </p>
                      <p className="aff-content mb-3 has-text-centered lh1" data-display="block">
                        <span className="savings">
                          Regular Price: <strong><span className="strikered"><span className="color_sav">$2,364</span></span></strong>
                        </span>
                      </p>
                      <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                        <strong>Today's Price: $297</strong>
                      </p>
                      <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                        <a 
                          href="https://buygoods.com/secure/upsell?account_id=10751&product_codename=2_RC12_297" 
                          className="lh1 yellow-button limit-button w100 accept-link"
                        >
                          Yes! Upgrade My Order!
                        </a>
                      </p>
                      <div className="has-text-centered">
                        <picture>
                          <Image src="/assets/upsells/1/cards.png" width={220} height={70} style={{ width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                      </div>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                        <strong>✔ 60-Day Money-Back Guarantee</strong>
                      </p>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                        <strong>✔ Free Shipping Included</strong>
                      </p>
                      <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                        <a 
                          href="https://getretinaclear.com/options-bg/2/2/" 
                          className="lh1 limit-button flightPop accept-link-downsell" 
                          style={{ color: '#c71585' }}
                        >
                          <u>No thanks, continue to order confirmation. I understand I'll never see this again.</u>
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Second Set of Testimonials */}
                  <div className="columns mb-5 aff-content" data-display="flex">
                    <div className="column">
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-10.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            My optometrist was surprised—my vision hasn't been this stable in years. Retina Clear really works and has become a daily part of my wellness routine for eye health.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>Emily H</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-11.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            Blurry mornings were the norm for me—until Retina Clear. I wake up and can see clearly right away. It's made my mornings easier and my days more productive overall.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>Robert C</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                    </div>
                    <div className="column">
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-12.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            My eyes used to strain in low light, but now I can read fine in dim rooms. Night vision has truly improved, and I feel more relaxed when watching TV or using my phone.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>Megan L</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                      <div className="columns is-mobile is-variable is-0">
                        <div className="column is-narrow pr-2">
                          <picture>
                            <Image src="/assets/upsells/1/test-13.jpg" width={50} height={50} style={{ borderRadius: '24px', border: '3px solid hsl(var(--main-color-hue),var(--main-color-saturation),var(--main-color-lightness))', width: 'auto', height: 'auto' }} alt="" />
                          </picture>
                        </div>
                        <div className="column">
                          <p className="verified mb-0 is-size-5 mb-1 gt">
                            <picture>
                              <Image src="/assets/upsells/1/rating.png" width={90} height={18} alt="" style={{ width: 'auto', height: 'auto' }} />
                            </picture>
                            5/5
                          </p>
                          <p className="mb-2 is-size-5 lh1">
                            <picture>
                              <Image src="/assets/upsells/1/quote.jpg" width={29} height={24} style={{ paddingRight: '10px', width: 'auto', height: 'auto' }} alt="" />
                            </picture>
                            Didn't expect much, but I'm reading small print again without glasses. This stuff is the real deal—it's brought back a level of comfort and confidence I'd missed.
                          </p>
                          <p className="is-size-6 mb-0 lh1"><strong>Brian C</strong> - Real RetinaClear Customer</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FAQ Section */}
                  <p className="is-size-2 is-size-3-touch has-text-weight-bold mb-5 mt-1 thorn lh1">Frequently Asked Questions</p>
                  <ul className="accordionfaq pb-5">
                    {[
                      {
                        question: "Is RetinaClear Right For Me?",
                        answer: "If you struggle with vision issues and your eyesight continues to decline, then RetinaClear is for you. RetinaClear is designed to naturally support retinal health and has improved the visual clarity of thousands of men and women aged 18 to 95."
                      },
                      {
                        question: "Is RetinaClear Safe?",
                        answer: "RetinaClear is a proprietary, natural formula manufactured in the USA at our FDA registered and GMP certified facility. We only use state of the art, precision engineered machinery under the strictest manufacturing standards.<br><br>Each ingredient is tested and free of contaminants, it's 100% plant-based and always Non-GMO. We also conduct third-party inspection and quality control to ensure high purity and potency. We always advise you ask your doctor before taking anything, just to be safer."
                      },
                      {
                        question: "How Many Bottles Should I Order?",
                        answer: "We recommend taking RetinaClear for at least 3 to 6 months to experience optimal vision improvement and support eye health. We offer a 6-bottle package that is our most popular option, which also comes with free shipping."
                      },
                      {
                        question: "What's in a bottle of RetinaClear?",
                        answer: <Image src="/assets/upsells/1/supplementFacts.webp" width={400} height={600} alt="label" style={{ width: 'auto', height: 'auto' }} />
                      },
                      {
                        question: "What's The Best Way To Take RetinaClear?",
                        answer: "Take 1 capsule with a big glass of cold water twice a day, preferably on an empty stomach to improve absorption. The proprietary blend of natural ingredients works quickly to support eye health."
                      },
                      {
                        question: "Is This A One Time Payment?",
                        answer: "Yes, your order today is a one-time payment with no auto-ship, subscriptions, or hidden charges."
                      },
                      {
                        question: "What If RetinaClear Doesn't Work For Me?",
                        answer: "Every single bottle of RetinaClear comes with our personal, 100% money-back guarantee! If for any reason you're unsatisfied with your results, just return all the bottles (even if empty) for a full, no questions asked refund."
                      },
                      {
                        question: "What Do I Do Now?",
                        answer: "Click on one of the package options below, enter your order details on our secure checkout page, and we'll ship your RetinaClear to you right away. Remember, when you order our 6-bottle package, you'll get free shipping as well."
                      }
                    ].map((faq, index) => (
                      <li key={index}>
                        <a 
                          className="actogglefaq blue-background" 
                          href="#"
                          onClick={(e) => { e.preventDefault(); toggleFAQ(index); }}
                        >
                          <div className="columns is-gapless is-mobile is-vcentered">
                            <div className="column">{faq.question}</div>
                            <div className="column is-narrow">
                              <span style={{ display: 'inline-block', width: '32px', height: '32px' }} className="mx-3">
                                <Image src="/assets/upsells/1/arrow-down.png" width={32} height={32} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </span>
                            </div>
                          </div>
                        </a>
                        <div className="innerfaq" style={{ display: faqOpenStates[index] ? 'block' : 'none' }}>
                          <div className="ifpad">
                            {typeof faq.answer === 'string' ? (
                              <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                            ) : (
                              faq.answer
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Final CTA */}
                  <p className="is-size-3 is-size-3-touch lh1 mb-4 is-capitalized has-text-centered" style={{ color: '#c71585' }}>
                    <strong>Click "Yes Upgrade My Order" below now</strong>
                  </p>
                  <div className="has-text-centered pb-4 is-size-3 is-size-3-touch lh1">
                    <strong style={{ borderBottom: '4px solid red' }}>
                      Offer Expires in <span className="counter5" style={{ color: 'red' }}>{formatTime(countdown)}</span>
                    </strong>
                  </div>
                  <div className="box is-paddingless mb-0">
                    <div className="px-2 py-4 green-solid-background">
                      <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                        <strong>RetinaClear 12 Bottle Super Savings Bundle!</strong>
                      </p>
                    </div>
                    <div className="px-2 pt-4 pb-5">
                      <p className="aff-content has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch" data-display="block">
                        NORMALLY: <span style={{ color: '#c71585' }} data-display="block">$197</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                        TODAY: <span style={{ color: 'green' }}>$24.75</span> per bottle
                      </p>
                      <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                        <picture>
                          <Image src="/assets/upsells/1/up-12.webp" width={270} height={350} style={{ maxWidth: '270px', width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                        <span className="aff-content save-badge" data-display="flex">Save 87%</span>
                      </p>
                      <p className="aff-content mb-3 has-text-centered lh1" data-display="block">
                        <span className="savings">
                          Regular Price: <strong><span className="strikered"><span className="color_sav">$2,364</span></span></strong>
                        </span>
                      </p>
                      <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                        <strong>Today's Price: $297</strong>
                      </p>
                      <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                        <a 
                          href="https://buygoods.com/secure/upsell?account_id=10751&product_codename=2_RC12_297" 
                          className="lh1 yellow-button limit-button w100 accept-link"
                        >
                          Yes! Upgrade My Order!
                        </a>
                      </p>
                      <div className="has-text-centered">
                        <picture>
                          <Image src="/assets/upsells/1/cards.png" width={220} height={70} style={{ width: 'auto', height: 'auto' }} alt="" />
                        </picture>
                      </div>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                        <strong>✔ 60-Day Money-Back Guarantee</strong>
                      </p>
                      <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                        <strong>✔ Free Shipping Included</strong>
                      </p>
                      <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                        <a 
                          href="https://getretinaclear.com/options-bg/2/2/" 
                          className="lh1 limit-button flightPop accept-link-downsell" 
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
                    12 more bottles of RetinaClear too many?
                  </p>
                  <p className="is-capitalized has-text-weight-bold is-size-2 is-size-3-touch has-text-black lh1">
                    How About Just 6 bottles<span className="aff-content" data-display="inline"> With <u className="yellowunder">88% Discount?</u></span>
                  </p>
                </div>
              </div>
              
              <div className="has-text-centered pb-4 is-size-3 is-size-3-touch lh1 aff-content" data-display="block">
                <strong style={{ borderBottom: '4px solid red' }}>
                  Offer Expires in <span className="counter6" style={{ color: 'red' }}>{formatTime(countdown)}</span>
                </strong>
              </div>
              
              <div className="box is-paddingless mb-6" style={{ border: '3px solid #0d3db8', background: '#fdfecf', borderRadius: '12px' }}>
                <div className="px-2 py-4 green-solid-background">
                  <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                    <strong>RetinaClear 6 Bottle Ultra Discount!</strong>
                  </p>
                </div>
                <div className="px-2 pt-4 pb-5">
                  <p className="has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch aff-content" data-display="block">
                    NORMALLY: <span style={{ color: '#c71585' }}>$197</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                    TODAY: <span style={{ color: 'green' }}>$24</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                    <picture>
                      <Image src="/assets/upsells/1/down-6.webp" width={270} height={350} style={{ maxWidth: '270px', width: '100%', height: 'auto' }} alt="" />
                    </picture>
                    <span className="save-badge aff-content" data-display="flex">Save 88%</span>
                  </p>
                  <p className="mb-3 has-text-centered lh1">
                    <span className="savings">
                      Regular Price: <strong><span className="strikered"><span className="color_sav">$1,182</span></span></strong>
                    </span>
                  </p>
                  <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                    <strong>Today's Price: $144</strong>
                  </p>
                  <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                    <a 
                      href="https://buygoods.com/secure/upsell?account_id=10751&product_codename=2_RC6_144" 
                      className="lh1 yellow-button limit-button w100 accept-link-downsell"
                    >
                      Yes! Upgrade My Order!
                    </a>
                  </p>
                  <div className="has-text-centered">
                    <Image src="/assets/upsells/1/cards.png" width={220} height={70} style={{ width: 'auto', height: 'auto' }} alt="" />
                  </div>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                    <strong>✔ 60-Day Money-Back Guarantee</strong>
                  </p>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                    <strong>✔ Free Shipping Included</strong>
                  </p>
                  <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                    <a 
                      href="https://getretinaclear.com/options-bg/2/2/" 
                      className="lh1 limit-button flightPop3" 
                      style={{ color: '#c71585' }}
                    >
                      <u>No thanks, I understand I cannot return to this page or see this offer again.</u>
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="pr-2 pb-2" style={{ float: 'left' }}>
                <Image src="/assets/upsells/shared/jim-cooper.webp" width={110} height={110} alt="" style={{ borderRadius: '12px', border: '#ccc solid 3px', width: 'auto', height: 'auto' }} />
              </div>
              <p>Hey, it's Jim here again. Look, I really don't want you to leave this page empty-handed.</p>
              <p>Getting our hands on the purest sources of RetinaClear's powerful eye supporting ingredients is getting harder and harder. <strong>I don't know how long we can keep production up for before we have to close shop.</strong></p>
              <p>So, we would like to give you <strong>one more chance</strong> to get our best discount on RetinaClear.</p>
              <p>We have your extra 6 bottles reserved and waiting for you on this page.</p>
              <p>I'd hate to have to give them to someone else.</p>
              <p>Remember, this is also a one-time only offer.</p>
              <p><strong>Once you leave this page, we cannot show you this again — no matter what.</strong></p>
              <p>Click the yes button below to add a 6-month supply of RetinaClear to your existing order for just <strong><u className="yellowunder">$24 per bottle!</u></strong> And we'll even ship this upgrade out to you for FREE as well!</p>
              <p>As always you can email me, at <strong><a href="mailto:support@getretinaclear.com">support@getretinaclear.com</a></strong> if you have any questions.</p>
              
              <p className="has-text-weight-bold has-text-left is-size-3 is-size-4-touch lh1 headlineColor1 is-capitalized">
                No-Risk 60-Day 100% Money-Back Guarantee
              </p>
              <p>Every single bottle of RetinaClear comes with our personal <strong>60-day 100% money-back guarantee</strong>. If for any reason you're unsatisfied with your results, just return all bottles (even if empty) for a full, no questions asked refund. That's how confident we are you'll absolutely love it!</p>
              <p className="mb-1">See you on the next page,</p>
              <div className="pb-4" style={{ width: '200px', height: '50px', display: 'inline-block' }}>
                <Image src="/assets/upsells/shared/signature.png" width={200} height={50} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              
              <p className="is-size-3 is-size-3-touch lh1 pb-4 is-capitalized has-text-centered" style={{ color: '#c71585' }}>
                <strong>Click "Yes Upgrade My Order" below now</strong>
              </p>
              <div className="has-text-centered pb-4 is-size-3 is-size-3-touch lh1 aff-content" data-display="block">
                <strong style={{ borderBottom: '4px solid red' }}>
                  Offer Expires in <span className="counter6" style={{ color: 'red' }}>{formatTime(countdown)}</span>
                </strong>
              </div>
              
              <div className="box is-paddingless mb-0" style={{ border: '3px solid #0d3db8', background: '#fdfecf', borderRadius: '12px' }}>
                <div className="px-2 py-4 green-solid-background">
                  <p className="has-text-white is-size-2 is-size-3-touch lh1 mb-0 is-capitalized has-text-centered">
                    <strong>RetinaClear 6 Bottle Ultra Discount!</strong>
                  </p>
                </div>
                <div className="px-2 pt-4 pb-5">
                  <p className="has-text-centered mb-1 lh1 has-text-weight-bold is-size-4 is-size-5-touch aff-content" data-display="block">
                    NORMALLY: <span style={{ color: '#c71585' }}>$197</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 has-text-weight-bold is-size-2 is-size-3-touch mb-0">
                    TODAY: <span style={{ color: 'green' }}>$24</span> per bottle
                  </p>
                  <p className="has-text-centered lh1 mb-0" style={{ position: 'relative' }}>
                    <picture>
                      <Image src="/assets/upsells/1/down-6.webp" width={270} height={350} style={{ maxWidth: '270px', width: '100%', height: 'auto' }} alt="" />
                    </picture>
                    <span className="save-badge aff-content" data-display="flex">Save 88%</span>
                  </p>
                  <p className="mb-3 has-text-centered lh1">
                    <span className="savings">
                      Regular Price: <strong><span className="strikered"><span className="color_sav">$1,182</span></span></strong>
                    </span>
                  </p>
                  <p className="has-text-centered mb-3 lh1" style={{ color: 'green' }}>
                    <strong>Today's Price: $144</strong>
                  </p>
                  <p className="is-size-3 is-size-4-touch is-uppercase mb-2 has-text-weight-bold has-text-centered">
                    <a 
                      href="https://buygoods.com/secure/upsell?account_id=10751&product_codename=2_RC6_144" 
                      className="lh1 yellow-button limit-button w100 accept-link-downsell"
                    >
                      Yes! Upgrade My Order!
                    </a>
                  </p>
                  <div className="has-text-centered">
                    <Image src="/assets/upsells/1/cards.png" width={220} height={70} style={{ width: 'auto', height: 'auto' }} alt="" />
                  </div>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-2">
                    <strong>✔ 60-Day Money-Back Guarantee</strong>
                  </p>
                  <p className="has-text-centered lh1 is-size-6 is-uppercase mb-5">
                    <strong>✔ Free Shipping Included</strong>
                  </p>
                  <p className="is-size-5 lh1 is-capitalized is-size-6-touch mb-0 has-text-weight-bold has-text-centered">
                    <a 
                      href="https://getretinaclear.com/options-bg/2/2/" 
                      className="lh1 limit-button flightPop3" 
                      style={{ color: '#c71585' }}
                    >
                      <u>No thanks, I understand I cannot return to this page or see this offer again.</u>
                    </a>
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
              The website's content and the product for sale is based upon the author's opinion and is provided solely on an "AS IS" and "AS AVAILABLE" basis. You should do your own research and confirm the information with other sources when searching for information regarding health issues and always review the information carefully with your professional health care provider before using any of the protocols presented on this website and/or in the product sold here. Neither buygoods nor the author are engaged in rendering medical or similar professional services or advice via this website or in the product, and the information provided is not intended to replace medical advice offered by a physician or other licensed healthcare provider. You should not construe buygoods's sale of this product as an endorsement by buygoods of the views expressed herein, or any warranty or guarantee of any strategy, recommendation, treatment, action, or application of advice made by the author of the product. Testimonials, case studies, and examples found on this page are results that have been forwarded to us by users of RetinaClear products and related products, and may not reflect the typical purchaser's experience, may not apply to the average person and are not intended to represent or guarantee that anyone will achieve the same or similar Results.
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
            <p className="has-text-weight-bold lh1 mb-2 is-size-4 has-text-centered">Add 12 bottles of RetinaClear for the low pricing of just</p>
            <p className="has-text-weight-bold thorn is-size-2 is-size-3-touch mb-2 has-text-centered lh1">$24.75 per bottle</p>
            <p className="has-text-weight-bold lh1 mb-2 is-size-3 is-size-4-touch has-text-centered yellowunder">that's $0.80 a day!</p>
            <p className="lh1 mb-3 has-text-centered is-size-5">(with <strong>free shipping</strong> and protected by my <strong>60-day 100% money-back guarantee</strong>)</p>
            <p className="is-size-4 is-size-5-touch mb-1 has-text-weight-bold">
              <a href="https://buygoods.com/secure/upsell?account_id=10751&product_codename=2_RC12_297" className="lh1 yellow-button w100 accept-link">I Accept Upgrade For $297</a>
            </p>
            <p className="mb-1 has-text-centered is-size-6">- OR -</p>
            <p className="is-size-4 is-capitalized is-size-5-touch mb-4 has-text-weight-bold">
              <a href="#" className="lh1 upsell-button flightPop2 w100">I Decline This Offer</a>
            </p>
            <p className="lh1 is-size-6 mb-0"><strong>NOTE:</strong> If I decline, I understand this will be the last time I'll ever see this offer and to get RetinaClear at this incredible discount. I fully understand the health implications of declining this offer and do not hold you, Jim Cooper responsible for this.</p>
          </div>
        </div>
      )}

      {/* Last Chance 2 Modal */}
      {showLastChance2Modal && (
        <div className="exit-pop">
          <div id="loadModal-lastchance2">
            <p className="has-text-weight-bold is-size-2 mt-3 is-size-3-touch mb-2 has-text-centered lh1" style={{ color: '#c71585' }}>VERY LAST CHANCE!</p>
            <p className="has-text-weight-bold lh1 mb-2 is-size-4 has-text-centered">Add 6 bottles of RetinaClear for the low-pricing of just</p>
            <p className="has-text-weight-bold thorn is-size-2 is-size-3-touch mb-2 has-text-centered lh1">$24 per bottle</p>
            <p className="has-text-weight-bold lh1 mb-2 is-size-3 is-size-4-touch has-text-centered yellowunder">that's $0.77 a day!</p>
            <p className="lh1 mb-3 has-text-centered is-size-5">(with <strong>free shipping</strong> and protected by my <strong>60-day 100% money-back guarantee</strong>)</p>
            <p className="is-size-4 is-size-5-touch mb-1 has-text-weight-bold">
              <a href="https://buygoods.com/secure/upsell?account_id=10751&product_codename=2_RC6_144" className="lh1 yellow-button w100 accept-link-downsell">I Accept Upgrade For $144</a>
            </p>
            <p className="mb-1 has-text-centered is-size-6">- OR -</p>
            <p className="is-size-4 is-capitalized is-size-5-touch mb-4 has-text-weight-bold">
              <a href="https://getretinaclear.com/options-bg/2/2/" className="lh1 upsell-button w100">I Decline This Offer</a>
            </p>
            <p className="lh1 is-size-6 mb-0"><strong>NOTE:</strong> If I decline, I understand this will be <strong>the last time</strong> I'll ever see this offer and to get RetinaClear at this incredible discount. I fully understand the health implications of declining this offer and do not hold you, Jim Cooper responsible for this.</p>
          </div>
        </div>
      )}
    </>
  );
}