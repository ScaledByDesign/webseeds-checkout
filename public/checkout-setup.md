# Checkout Page Setup Instructions

## Features Added

1. **GeoIP Auto-Detection**
   - Automatically detects user's location and pre-fills:
     - Country
     - State/Province
     - City
   - Uses ipapi.co free tier (no API key required)
   - Falls back gracefully if detection fails

2. **Google Places Autocomplete**
   - Address autocomplete for both shipping and billing addresses
   - Automatically fills in:
     - Street address
     - City
     - State
     - ZIP/Postal code
     - Country
   - Supports US, Canada, UK, Australia, and New Zealand addresses

## Setup Instructions

### Google Places API Setup

1. **Get a Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Places API" and "Maps JavaScript API"
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

2. **Add Your API Key**
   - Open `checkout.html`
   - Find this line:
     ```html
     <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY&libraries=places&callback=initAutocomplete" async defer></script>
     ```
   - Replace `YOUR_GOOGLE_API_KEY` with your actual API key

### Testing

1. **Test GeoIP Detection**
   - Open the checkout page in a browser
   - The country, state, and city fields should auto-populate based on your IP location
   - This works immediately without any setup

2. **Test Google Places Autocomplete**
   - After adding your API key, start typing an address in the "Street Address" field
   - You should see address suggestions appear
   - Selecting an address will auto-fill all related fields

### Customization

1. **Change GeoIP Provider**
   - Current: ipapi.co (free, 1000 requests/month)
   - Alternatives:
     - ipinfo.io (requires API key)
     - ipgeolocation.io (requires API key)
     - MaxMind GeoIP2 (requires account)

2. **Modify Autocomplete Countries**
   - Edit the `componentRestrictions` in the JavaScript:
     ```javascript
     componentRestrictions: { country: ['us', 'ca', 'gb', 'au', 'nz'] }
     ```
   - Add or remove country codes as needed

3. **Styling the Autocomplete Dropdown**
   - The CSS for the Google Places dropdown is already included
   - Modify the `.pac-container`, `.pac-item` styles to match your design

### Security Notes

1. **API Key Restrictions**
   - Always restrict your Google API key to specific domains
   - Never commit API keys to public repositories
   - Consider using environment variables for production

2. **Privacy Considerations**
   - GeoIP detection happens client-side
   - No personal data is stored unless the user submits the form
   - Consider adding a privacy notice about location detection

### Troubleshooting

1. **Autocomplete Not Working**
   - Check browser console for API errors
   - Verify API key is valid and has Places API enabled
   - Ensure the domain is whitelisted in API restrictions

2. **GeoIP Not Working**
   - Check if ipapi.co is accessible (not blocked by ad blockers)
   - Verify you haven't exceeded the free tier limit
   - Test with a VPN to see different locations

3. **Floating Labels Issue**
   - The code already triggers events to update floating labels
   - If labels don't move, check the CSS classes match