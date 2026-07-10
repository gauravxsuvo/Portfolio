"use client";

import { useEffect } from "react";

export function ConsoleEasterEgg() {
  useEffect(() => {
    console.log(
      "%cguest@gauravxsuvo:~$ %cwhoami",
      "color:#33ff00;font-family:monospace",
      "color:#ffb000;font-family:monospace"
    );
    console.log(
      "%clooking around? say hi -> gauravrajsinghoppo@gmail.com",
      "color:#33ff00;font-family:monospace"
    );
  }, []);

  return null;
}
