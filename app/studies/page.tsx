import type { Metadata } from 'next';
import { MorphGallery } from '../MorphGallery';

export const metadata: Metadata = {
  title: 'Particle Studies · Magnetic Morph Studies',
  description: 'The original grid and carousel of compact magnetic particle forms.',
};

export default function StudiesPage() {
  return <MorphGallery />;
}
