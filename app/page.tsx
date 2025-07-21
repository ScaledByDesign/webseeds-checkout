import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to checkout page as the main landing
  redirect('/checkout')
}