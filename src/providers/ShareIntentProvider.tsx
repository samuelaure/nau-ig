import React, { createContext, useContext, useState, useEffect } from 'react';
import { useShareIntent as useExpoShareIntent } from 'expo-share-intent';
import { savePost } from '../repositories/PostRepository';
import { sendToMake } from '../services/make';
import { getSetting } from '../storage/settings';

interface ShareIntentContextType {
  value: any;
  isSaving: boolean;
  resetShareIntent: () => void;
  saveShareIntent: (metadata: {
    title: string;
    content: string;
    tags: string[];
    frequency: string;
  }) => Promise<void>;
}

const ShareIntentContext = createContext<ShareIntentContextType | undefined>(
  undefined
);

export const ShareIntentProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const { value, resetShareIntent, error } = useExpoShareIntent();
  const [isSaving, setIsSaving] = useState(false);

  const saveShareIntent = async (metadata: any) => {
    if (!value?.value) return;

    setIsSaving(true);
    try {
      const instagramUrl = value.value;

      // 1. Save to Local DB (Repository handles the SM-2 initialization logic)
      await savePost({
        instagramUrl,
        ...metadata
      });

      // 2. Send to Make Webhook
      const webhookUrl = await getSetting('make_webhook_url');
      if (webhookUrl) {
        // We fire and forget or wait depending on UX needs.
        // Requirements say "at the same time", so we await for reliability.
        await sendToMake(webhookUrl, instagramUrl);
      }

      // 3. Clear the intent so modal closes
      resetShareIntent();
    } catch (err) {
      console.error('Failed to save share intent:', err);
      // In a real app, show a toast here
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ShareIntentContext.Provider
      value={{ value, isSaving, resetShareIntent, saveShareIntent }}
    >
      {children}
    </ShareIntentContext.Provider>
  );
};

export const useShareIntent = () => {
  const context = useContext(ShareIntentContext);
  if (!context)
    throw new Error('useShareIntent must be used within a ShareIntentProvider');
  return context;
};
