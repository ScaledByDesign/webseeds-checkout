"use client"

import { useState } from "react"

export default function ComparePage() {
  const [frameWidth, setFrameWidth] = useState<number>(640)
  const [showOverlay, setShowOverlay] = useState<boolean>(false)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5)

  const sizes: Array<{label: string; width: number}> = [
    { label: "sm 375", width: 375 },
    { label: "md 768", width: 768 },
    { label: "lg 1024", width: 1024 },
    { label: "xl 1280", width: 1280 },
    { label: "full", width: 0 },
  ]

  return (
    <main className="min-h-screen p-6 bg-[#f5f5f5]">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold">Design vs App – Side-by-side Compare</h1>
          <p className="text-sm text-gray-600">Left: /design/checkout.html • Right: /checkout</p>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-medium">Preset widths:</span>
          {sizes.map((s) => (
            <button
              key={s.label}
              className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm"
              onClick={() => setFrameWidth(s.width)}
            >
              {s.label}
            </button>
          ))}

          <div className="flex items-center gap-2 ml-4">
            <label className="text-sm">Custom:</label>
            <input
              type="range"
              min={320}
              max={1440}
              value={frameWidth === 0 ? 1440 : frameWidth}
              onChange={(e) => setFrameWidth(parseInt(e.target.value, 10))}
            />
            <span className="text-sm w-16 text-right">{frameWidth === 0 ? "auto" : `${frameWidth}px`}</span>
          </div>

          <div className="flex items-center gap-2 ml-6">
            <label className="text-sm">Overlay</label>
            <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(overlayOpacity * 100)}
              onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10) / 100)}
              disabled={!showOverlay}
            />
            <span className="text-sm w-10 text-right">{Math.round(overlayOpacity * 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design */}
          <section className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-medium">Design (/design/checkout.html)</h2>
            </div>
            <div className="overflow-auto border rounded">
              <iframe
                title="design"
                src="/design/checkout.html"
                style={{ width: frameWidth === 0 ? "100%" : `${frameWidth}px`, height: 1400, border: "0" }}
              />
            </div>
          </section>

          {/* App */}
          <section className="bg-white rounded-lg border border-gray-200 p-3 relative">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-medium">App (/checkout)</h2>
            </div>
            <div className="overflow-auto border rounded relative">
              <iframe
                title="app"
                src="/checkout"
                style={{ width: frameWidth === 0 ? "100%" : `${frameWidth}px`, height: 1400, border: "0" }}
              />
              {showOverlay && (
                <iframe
                  title="overlay-design"
                  src="/design/checkout.html"
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    width: frameWidth === 0 ? "100%" : `${frameWidth}px`,
                    height: 1400,
                    opacity: overlayOpacity,
                    border: "0",
                  }}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

