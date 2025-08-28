# Google Places Autocomplete Setup

## Overview
The checkout form now includes Google Places Autocomplete functionality that matches the design implementation. When enabled, it will:
- Auto-complete addresses as users type
- Automatically populate city, state, and ZIP code fields
- Support multiple countries (US, CA, GB, AU, NZ)
- Use GeoIP detection to pre-fill country and state based on user location

## Current Status
The implementation is complete but requires a Google Maps API key to activate.

## How to Enable

### 1. Get a Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API** and **Maps JavaScript API**
4. Go to **Credentials** and create an API key
5. (Recommended) Restrict the API key to your domain for security

### 2. Add the API Key to Your Environment
Add the following to your `.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Restart the Development Server
```bash
npm run dev
```

## Features Implemented

### Address Autocomplete
- Triggers when user focuses on the address field
- Shows dropdown with address suggestions
- Supports addresses from US, Canada, UK, Australia, and New Zealand
- Parses and populates fields automatically

### GeoIP Detection
- Automatically detects user's location using ipapi.co
- Pre-fills country and state fields based on location
- Caches results for 24 hours to reduce API calls

### Lazy Loading
- Google Maps script only loads when user focuses on address field
- Fallback loading after 5 seconds
- Prevents unnecessary API calls and improves initial page load

## Implementation Details

The implementation matches the design HTML exactly:
- Uses the same lazy loading approach
- Supports the same countries
- Includes GeoIP detection with caching
- Dispatches events to update floating labels properly

## Without API Key
If no API key is configured:
- Address fields work as regular text inputs
- Manual entry is still fully functional
- Form validation continues to work normally
- GeoIP detection still pre-fills country and state

## Testing
To test the implementation:
1. Add your Google Maps API key to `.env.local`
2. Go to the checkout page
3. Click on the "Street Address" field
4. Start typing an address
5. Select an address from the dropdown
6. Verify that city, state, and ZIP are populated automatically