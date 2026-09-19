"use client";

import { BackHeader } from "@/_components/back-header";

const otherClubs = [
  { id: "oc1", name: "Municipal de Lima" },
  { id: "oc2", name: "Sport Huaraz" },
  { id: "oc3", name: "Raura FC" },
];

export default function OtroClubPage() {
  return (
    <div className="w-full">
      <BackHeader />

      <div className="px-4">
        {otherClubs.map((club) => (
          <button
            key={club.id}
            className="flex w-full cursor-pointer items-center justify-between border-b border-brand-200 py-4"
          >
            <span className="text-sm text-text-primary">{club.name}</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
