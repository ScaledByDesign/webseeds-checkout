'use client'

import Image from 'next/image'
import Link from 'next/link'
import CountdownTimer from '@/components/CountdownTimer'
import { useState } from 'react'

export default function CheckoutPage() {
  const [isExpired, setIsExpired] = useState(false)

  const handleTimerExpire = () => {
    setIsExpired(true)
    // Optional: Show alert when timer expires
    alert('Special price has expired! The regular price will now apply.')
    // Optional: You could redirect to a different page or refresh with new pricing
    // window.location.reload()
  }

  return (
    <>
      <header className="py-6 md:py-8 border-b border-gray-cd">
        <div className="container !px-0 !md:px-10">
          <div className="flex flex-col-reverse md:flex-row justify-between items-center">
            <div className="py-4 md:py-0 flex gap-3 justify-center md:justify-start items-end w-full md:w-auto">
              <Image className="max-w-full w-110" src="/assets/images/Logo.svg" alt="Fitspresso Logo" width={110} height={40} priority />
              <div className="gap-3 hidden md:flex items-center">
                <p className="font-medium text-4xl text-gray-373737 whitespace-nowrap">Secure Checkout</p>
                <Image className="w-7" src="/assets/images/lock.svg" alt="Secure" width={28} height={28} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-2xl text-purple-976987">
                Special Price Reserved For
              </p>
              <div className="bg-purple-976987 text-white px-4 py-2 rounded-lg">
                <CountdownTimer 
                  initialSeconds={599}
                  className="text-white font-bold text-2xl" 
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="grid grid-col-1 md:grid-cols-2">
          <div>
            <div className="md:pr-16 py-8 md:py-12 md:max-w-[56.3rem] md:ml-auto sm:max-w-4xl max-w-full px-6 md:px-0 mx-auto md:mr-0">
              {/* Mobile order summary */}
              <div className="md:hidden mb-8">
                <ul className="flex flex-col gap-6 pb-6 border-b-2 border-gray-cd">
                  <li className="flex justify-between items-center gap-5">
                    <div className="flex gap-4 items-center">
                      <div>
                        <Image className="w-54" src="/assets/images/6-bottles.png" alt="6 Bottle Pack" width={54} height={54} />
                      </div>
                      <div>
                        <h3 className="font-medium text-2.1rem leading-relaxed">
                          Fitspresso <br /> 6 Bottle Super Pack
                        </h3>
                        <p className="text-purple-976987 font-medium text-1.7rem">Most Popular!</p>
                      </div>
                    </div>
                    <div className="font-medium text-2.5rem text-gray-373737 uppercase">$294</div>
                  </li>
                </ul>
                <ul className="pt-6 font-medium text-2.5rem text-gray-373737 flex flex-col gap-3">
                  <li className="flex justify-between items-center">
                    <div>Shipping</div>
                    <div className="uppercase">free</div>
                  </li>
                  <li className="flex justify-between items-center">
                    <div>Total</div>
                    <div className="uppercase">
                      <small className="text-1.63rem font-normal text-gray-656565 mr-2">USD</small> $294
                    </div>
                  </li>
                </ul>
              </div>

              {/* Express Checkout */}
              <div>
                <h3 className="text-center font-bold text-2.07rem text-gray-373737">Express Checkout</h3>
                <div className="flex justify-between gap-3 mt-5 flex-wrap md:flex-nowrap">
                  <button className="cursor-pointer w-full md:w-1/3">
                    <Image className="w-full hidden md:block" src="/assets/images/PayPal.svg" alt="PayPal" width={200} height={50} />
                    <Image className="w-full md:hidden" src="/assets/images/paypal-big.svg" alt="PayPal" width={200} height={50} />
                  </button>
                  <div className="flex justify-between gap-4 items-center w-full md:w-2/3">
                    <button className="cursor-pointer w-1/2 md:w-full">
                      <Image className="w-full" src="/assets/images/applypay.svg" alt="Apple Pay" width={200} height={50} />
                    </button>
                    <button className="cursor-pointer w-1/2 md:w-full">
                      <Image className="w-full" src="/assets/images/googlepay.svg" alt="Google Pay" width={200} height={50} />
                    </button>
                  </div>
                </div>
                <div className="mt-10 mb-10 border-b-2 border-gray-cd relative">
                  <span className="absolute inline-block bg-white w-31 left-1/2 top-1/2 -translate-1/2 text-center text-gray-a6 text-2.13rem font-medium">
                    OR
                  </span>
                </div>
              </div>

              {/* Checkout Form */}
              <form action="#">
                <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Contact</h3>
                <div>
                  <input
                    type="text"
                    className="w-full border-3 border-gray-cd px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none"
                    name=""
                    placeholder="Email Address  (To receive order confirmation email)"
                  />
                </div>

                <div className="mt-10">
                  <h3 className="mb-6 text-gray-373738 font-medium text-2.7rem">Shipping</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                        name=""
                        placeholder="Street Address"
                      />
                      <span className="absolute w-9 top-1/2 right-9 -translate-y-1/2">
                        <Image src="/assets/images/search.svg" alt="Search" width={36} height={36} style={{ width: 'auto', height: 'auto' }} />
                      </span>
                    </div>
                    <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
                      <div className="w-full">
                        <input
                          type="text"
                          className="w-full border-3 border-gray-cd px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                          name=""
                          placeholder="City"
                        />
                      </div>
                      <div className="w-full">
                        <input
                          type="text"
                          className="w-full border-3 border-gray-cd px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                          name=""
                          placeholder="State"
                        />
                      </div>
                      <div className="w-full">
                        <input
                          type="text"
                          className="w-full border-3 border-gray-cd px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                          name=""
                          placeholder="Zip Code"
                        />
                      </div>
                    </div>
                    <div>
                      <select
                        name=""
                        className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                        id=""
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Country
                        </option>
                        <option value="in">India</option>
                        <option value="bn">Bangladesh</option>
                        <option value="cn">China</option>
                        <option value="ru">Russia</option>
                        <option value="ir">Iran</option>
                      </select>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                        name=""
                        placeholder="Phone Number (For delivery confirmation texts)"
                      />
                      <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2">
                        <Image src="/assets/images/info.svg" alt="Info" width={40} height={40} style={{ width: 'auto', height: 'auto' }} />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <h3 className="mb-5 text-gray-373738 font-medium text-2.7rem">Payment</h3>
                  <p className="flex gap-3 mb-4 items-center font-medium text-2.25rem">
                    All transactions are secure and encrypted{' '}
                    <Image className="w-8" src="/assets/images/lock.svg" alt="Secure" width={32} height={32} />
                  </p>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                        name=""
                        placeholder="Card Number"
                      />
                      <div className="absolute top-1/2 right-9 -translate-y-1/2 flex gap-2">
                        <Image className="h-13" src="/assets/images/visa.svg" alt="Visa" width={52} height={52} style={{ width: 'auto', height: 'auto' }} />
                        <Image className="h-13" src="/assets/images/mastercard.svg" alt="Mastercard" width={52} height={52} style={{ width: 'auto', height: 'auto' }} />
                        <Image className="h-13" src="/assets/images/american-express.svg" alt="American Express" width={52} height={52} style={{ width: 'auto', height: 'auto' }} />
                      </div>
                    </div>
                    <div className="sm:flex justify-between gap-3 sm:space-y-0 space-y-4">
                      <div className="w-full">
                        <input
                          type="text"
                          className="w-full border-3 border-gray-cd px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                          name=""
                          placeholder="Expiration Date (MM/YY)"
                        />
                      </div>
                      <div className="relative w-full">
                        <input
                          type="text"
                          className="w-full border-3 border-gray-cd pl-9 pr-17 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                          name=""
                          placeholder="Security Code"
                        />
                        <span className="absolute w-10 top-1/2 right-9 -translate-y-1/2">
                          <Image src="/assets/images/info.svg" alt="Info" width={40} height={40} style={{ width: 'auto', height: 'auto' }} />
                        </span>
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        className="w-full border-3 border-gray-cd px-9 py-8 focus:outline-0 rounded-xl text-1.94rem text-gray-666666 leading-none bg-gray-f9"
                        name=""
                        placeholder="Name On Card"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-4 cursor-pointer select-none">
                        <input type="checkbox" className="hidden peer" />
                        <span className="w-9 h-9 border-[3px] border-gray-666666 flex items-center justify-center peer-checked:bg-gray-666666 rounded-md">
                          <Image src="/assets/images/check.svg" alt="Check" width={36} height={36} style={{ width: 'auto', height: 'auto' }} />
                        </span>
                        <span className="text-gray-373738 font-medium text-1.63rem">Use shipping address as payment address</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <Link
                    href="/upsell/1"
                    className="block py-5 w-full rounded-full bg-yellow-f6c657 text-center font-bold text-3.7rem text-gray-373737 leading-none hover:bg-yellow-f4bd3f transition-colors"
                  >
                    Place Your Order
                  </Link>
                </div>

                <div className="flex justify-between px-4 items-center gap-6 mt-8">
                  <div>
                    <Image className="h-18" src="/assets/images/mcafee-seeklogo.svg" alt="McAfee" width={72} height={72} style={{ width: 'auto', height: 'auto' }} />
                  </div>
                  <div>
                    <Image className="h-24" src="/assets/images/Norton.svg" alt="Norton" width={96} height={96} style={{ width: 'auto', height: 'auto' }} />
                  </div>
                  <div>
                    <Image className="h-19" src="/assets/images/Truste.svg" alt="TRUSTe" width={76} height={76} style={{ width: 'auto', height: 'auto' }} />
                  </div>
                </div>

                <div className="md:mt-12 md:border-b-2 border-gray-cd"></div>

                <div className="mt-8 pl-8 hidden md:block">
                  <div>
                    <label className="flex items-center gap-5 cursor-pointer select-none">
                      <input type="checkbox" className="peer hidden" />
                      <span className="w-9 h-9 border-[3px] border-gray-666666 flex items-center justify-center rounded-md peer-checked:[&>img]:block">
                        <Image src="/assets/images/check-dark.svg" alt="Check" className="hidden" width={36} height={36} />
                      </span>
                      <span className="text-gray-656565 font-medium text-1.8rem">Get SMS Alerts About Your Order</span>
                    </label>
                    <p className="text-1.7rem max-w-175 text-gray-656565 leading-[1.6]">
                      Stay up to date on your purchase with order confirmation, shipping updates & special customer only discounts.
                    </p>
                  </div>
                  <div className="mt-6">
                    <p className="text-1.7rem text-gray-656565 font-medium">&copy; 2025 Fitspresso. All Rights Reserved</p>
                    <p className="text-gray-666666 text-1.3rem">
                      These Statements Have Not Been Evaluated By The Food And Drug Administration. This Product Is Not Intended To Diagnose, Treat,
                      Cure Or Prevent Any Disease.
                    </p>
                  </div>

                  <ul className="mt-6 flex gap-6">
                    <li>
                      <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                        Refund Policy
                      </Link>
                    </li>
                    <li>
                      <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                        Term of Service
                      </Link>
                    </li>
                  </ul>
                </div>
              </form>
            </div>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="bg-gray-f2">
            <div className="md:pl-16 py-8 md:py-12 md:max-w-[56.3rem] md:mr-auto sm:max-w-4xl max-w-full px-6 md:px-0 mx-auto md:ml-0">
              <div>
                <div className="hidden md:block">
                  <ul className="flex flex-col gap-6 pb-6 border-b-2 border-gray-cd">
                    <li className="flex justify-between items-center gap-5">
                      <div className="flex gap-4 items-center">
                        <div>
                          <Image className="w-44" src="/assets/images/6-bottles.png" alt="6 Bottle Pack" width={44} height={44} />
                        </div>
                        <div>
                          <h3 className="font-medium text-2.13rem leading-relaxed">
                            Fitspresso <br /> 6 Bottle Super Pack
                          </h3>
                          <p className="text-purple-976987 font-medium text-1.63rem">Most Popular!</p>
                        </div>
                      </div>
                      <div className="font-medium text-2.38rem text-gray-373737 uppercase">$294</div>
                    </li>
                    <li className="flex justify-between items-center gap-5">
                      <div className="flex gap-4 items-center">
                        <div>
                          <Image className="w-44" src="/assets/images/bonus-ebooks.png" alt="Bonus eBooks" width={44} height={44} />
                        </div>
                        <div>
                          <h3 className="font-medium text-2.13rem leading-relaxed">Bonus eBooks</h3>
                          <p className="text-purple-976987 font-medium text-1.63rem">First Time Customer</p>
                        </div>
                      </div>
                      <div className="font-medium text-2.38rem text-gray-373737 uppercase">Free</div>
                    </li>
                    <li className="flex justify-between items-center gap-5">
                      <div className="flex gap-4 items-center">
                        <div>
                          <Image className="w-44" src="/assets/images/bonus-call.png" alt="Bonus Call" width={44} height={44} />
                        </div>
                        <div>
                          <Image className="w-15" src="/assets/images/shape-1.svg" alt="Shape" width={15} height={15} />
                          <h3 className="font-medium text-2.13rem leading-relaxed">Bonus Coaching Call</h3>
                          <p className="text-purple-976987 font-medium text-1.63rem">Limited Time</p>
                        </div>
                      </div>
                      <div className="font-medium text-2.38rem text-gray-373737 uppercase">Free</div>
                    </li>
                  </ul>
                  <ul className="pt-6 font-medium text-2.19rem text-gray-373737 flex flex-col gap-3">
                    <li className="flex justify-between items-center">
                      <div>Shipping</div>
                      <div className="uppercase">free</div>
                    </li>
                    <li className="flex justify-between items-center">
                      <div>Total</div>
                      <div className="uppercase">
                        <small className="text-1.63rem font-normal text-gray-656565 mr-2">USD</small> $294
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Trust Badges */}
                <ul className="hidden md:flex pt-8 items-center justify-between gap-3 text-purple-976987 font-medium md:text-1.5rem">
                  <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                    <Image className="md:w-11.25 w-12" src="/assets/images/circle-check.svg" alt="Check" width={45} height={45} />
                    <span>One-Time Purchase</span>
                  </li>
                  <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                    <Image className="md:w-11.25 w-12" src="/assets/images/circle-check.svg" alt="Check" width={45} height={45} />
                    <span>No Hidden Fees</span>
                  </li>
                  <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                    <Image className="md:w-11.25 w-12" src="/assets/images/circle-check.svg" alt="Check" width={45} height={45} />
                    <span>Fast, Secure Payment</span>
                  </li>
                </ul>

                {/* Testimonials */}
                <div className="mt-8 flex flex-col-reverse md:flex-col">
                  <div className="mt-8 flex flex-col gap-5">
                    <h3 className="text-center font-bold text-2.7rem mb-4">
                      250,000+ Customers! <br /> Your Story Can Be Next
                    </h3>
                    <div className="bg-white p-6 border-2 border-purple-916886 md:border-gray-cd rounded-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                          <div>
                            <Image
                              className="w-31.75 h-31.75 object-cover"
                              src="/assets/images/olivia.png"
                              alt="Olivia Harris"
                              width={127}
                              height={127}
                            />
                          </div>
                          <div>
                            <h4 className="text-gray-373737 font-bold text-2rem mb-2 leading-none">Olivia Harris</h4>
                            <p className="flex items-center gap-1 font-medium text-1.69rem text-purple-976987">
                              <Image className="w-7.25" src="/assets/images/circle-check.svg" alt="Verified" width={29} height={29} />
                              Verified Customer
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2 items-center">
                            {[...Array(5)].map((_, i) => (
                              <Image key={i} className="w-7.25" src="/assets/images/star.svg" alt="Star" width={29} height={29} />
                            ))}
                          </div>
                          <span className="inline-block mt-4 px-4 py-1.5 bg-purple-986988 text-white font-bold text-1.45rem rounded-[5rem] leading-none">
                            5 Stars
                          </span>
                        </div>
                      </div>
                      <p className="mt-5 italic font-medium text-1.94rem leading-[1.3] text-gray-373737">
                        &quot;I can hardly believe it, I know longer need my glasses and I feel amazing. I&apos;m a believer.&quot;
                      </p>
                    </div>

                    <div className="bg-white p-6 border-2 border-purple-916886 md:border-gray-cd rounded-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                          <div>
                            <Image
                              className="w-31.75 h-31.75 object-cover"
                              src="/assets/images/emily.png"
                              alt="Emily Parker"
                              width={127}
                              height={127}
                            />
                          </div>
                          <div>
                            <h4 className="text-gray-373737 font-bold text-2rem mb-2 leading-none">Emily Parker</h4>
                            <p className="flex items-center gap-1 font-medium text-1.69rem text-purple-976987">
                              <Image className="w-7.25" src="/assets/images/circle-check.svg" alt="Verified" width={29} height={29} />
                              Verified Customer
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-2 items-center">
                            {[...Array(5)].map((_, i) => (
                              <Image key={i} className="w-7.25" src="/assets/images/star.svg" alt="Star" width={29} height={29} />
                            ))}
                          </div>
                          <span className="inline-block mt-4 px-4 py-1.5 bg-purple-986988 text-white font-bold text-1.45rem rounded-[5rem] leading-none">
                            5 Stars
                          </span>
                        </div>
                      </div>
                      <p className="mt-5 italic font-medium text-1.94rem leading-[1.3] text-gray-373737">
                        &quot;I can hardly believe it, I know longer need my glasses and I feel amazing. I&apos;m a believer.&quot;
                      </p>
                    </div>
                  </div>

                  {/* Mobile Trust Badges */}
                  <ul className="md:hidden pt-8 flex items-center justify-between gap-3 text-purple-976987 font-medium text-xl">
                    <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                      <Image className="w-8" src="/assets/images/circle-check.svg" alt="Check" width={32} height={32} />
                      <span>One-Time Purchase</span>
                    </li>
                    <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                      <Image className="w-8" src="/assets/images/circle-check.svg" alt="Check" width={32} height={32} />
                      <span>No Hidden Fees</span>
                    </li>
                    <li className="flex w-full items-center gap-3.25 border-3 border-purple-986988 bg-white rounded-full px-5 py-2">
                      <Image className="w-8" src="/assets/images/circle-check.svg" alt="Check" width={32} height={32} />
                      <span>Fast, Secure Payment</span>
                    </li>
                  </ul>

                  {/* Money Back Guarantee */}
                  <div className="bg-purple-916886 md:bg-white py-8 px-8 border-2 border-purple-916886 rounded-xl mt-8">
                    <div className="flex justify-center items-center gap-6">
                      <div className="w-full text-center">
                        <Image className="w-66 mx-auto" src="/assets/images/money-back.png" alt="Money Back" width={264} height={264} />
                      </div>
                      <div className="w-full">
                        <h3 className="text-[#F6C657] md:text-purple-916885 font-bold text-3.25rem leading-[1.2]">
                          100% <br />
                          Money-Back <br /> Guarantee!
                        </h3>
                      </div>
                    </div>
                    <p className="mt-5 text-center text-1.94rem leading-[1.3] text-white md:text-gray-373737">
                      There&apos;s absolutely zero risk in trying! You will love how Fitspresso makes you feel and transforms your life! If you decide the
                      product isn&apos;t for you, just let us know, and we will refund your money, no questions asked.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile Footer */}
              <div className="mt-8 md:pl-8 md:hidden">
                <div>
                  <label className="flex items-center gap-5 cursor-pointer select-none">
                    <input type="checkbox" className="peer hidden" />
                    <span className="w-9 h-9 border-[3px] border-gray-666666 flex items-center justify-center rounded-md peer-checked:[&>img]:block">
                      <Image src="/assets/images/check-dark.svg" alt="Check" className="hidden" width={36} height={36} />
                    </span>
                    <span className="text-gray-656565 font-medium text-1.8rem">Get SMS Alerts About Your Order</span>
                  </label>
                  <p className="text-1.7rem text-gray-656565 leading-[1.6]">
                    Stay up to date on your purchase with order confirmation, shipping updates & special customer only discounts.
                  </p>
                </div>
                <div className="mt-15">
                  <p className="text-1.7rem text-gray-656565 font-medium">&copy; 2025 Fitspresso. All Rights Reserved</p>
                  <p className="text-gray-666666 text-1.3rem">
                    These Statements Have Not Been Evaluated By The Food And Drug Administration. This Product Is Not Intended To Diagnose, Treat,
                    Cure Or Prevent Any Disease.
                  </p>
                </div>

                <ul className="mt-16 flex gap-8">
                  <li>
                    <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                      Refund Policy
                    </Link>
                  </li>
                  <li>
                    <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link className="font-medium underline text-1.8rem text-gray-666666" href="#">
                      Term of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}