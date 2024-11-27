import React from 'react';

export function Navbar() {
  return (
    <header className="flex flex-col justify-center px-16 w-full bg-stone-50 min-h-[72px] max-md:px-5 max-md:max-w-full">
      <nav className="flex flex-wrap gap-10 justify-between items-center w-full max-md:max-w-full">
        <div className="flex justify-center items-center self-stretch my-auto min-h-[40px] w-[198px]">
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/c4345af57a564f71b6050b95a82b3e60/a1aca6afe8d679ce8df02500685d33a6693876394de6b4d39eaed12db5b249a1?apiKey=c4345af57a564f71b6050b95a82b3e60&"
            alt="NatureScout Logo"
            className="object-contain self-stretch my-auto aspect-[5.92] w-[213px]"
          />
        </div>
        <div className="flex gap-8 justify-center items-center self-stretch my-auto text-base min-w-[240px]">
          <div className="flex gap-8 items-center self-stretch my-auto text-black">
            <button className="flex gap-1 justify-center items-center self-stretch my-auto">
              Über Uns
            </button>
          </div>
          <button className="flex gap-4 justify-center items-center self-stretch my-auto text-white gap-2 px-5 py-2 border border-solid bg-stone-400 border-stone-400">
            Jetzt Anmelden
          </button>
        </div>
      </nav>
    </header>
  );
}