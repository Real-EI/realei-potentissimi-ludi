"use client";

import React, { useState } from "react";
import PlayGame from "@/components/PlayGame";
import SelectAuction from "@/components/SelectAuction";
import FadeComponent from "@/components/FadeComponent";


export default function Play() {
    const [selectedAuction, setSelectedAuction] = useState(null);

    const handleSelectAuction = (auction) => {
        setSelectedAuction(auction);
        window.scrollTo({ top: 0, behavior: "smooth" });     // the new screen starts at the top
    };

    return (
        <>
            <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
                <div className="mx-auto w-full max-w-7xl px-6 pb-20 pt-28 lg:px-12">
                    {/* keyed: switching between the auction list and a game (or another auction) fades in again */}
                    <FadeComponent key={selectedAuction?.id ?? "select"}>
                        {selectedAuction ? (
                            <PlayGame auction={selectedAuction} setSelectedAuction={setSelectedAuction}/>
                        ) : (
                            <SelectAuction selectedAuction={selectedAuction} onSelect={handleSelectAuction}/>
                        )}
                    </FadeComponent>
                </div>
            </main>
        </>
    );


}