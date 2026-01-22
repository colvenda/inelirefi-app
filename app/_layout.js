import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import React from 'react';

export default function Layout() {
  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.png" />
      </Head>
      <Slot />
    </>
  );
}