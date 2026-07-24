/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MediaType } from '../types';
import { generateSvgCover } from '../utils/helpers';
import { getDisplayCoverCandidates } from '../utils/imageProxy';

interface CoverImageProps {
  coverUrl?: string;
  title: string;
  creator?: string;
  type: MediaType;
  mode?: 'card' | 'detail';
  className?: string;
}

export default function CoverImage({
  coverUrl = '',
  title,
  creator = '佚名',
  type,
  mode = 'card',
  className = '',
}: CoverImageProps) {
  const fallbackCover = React.useMemo(
    () => generateSvgCover(title, creator || '佚名', type),
    [title, creator, type],
  );
  const candidates = React.useMemo(() => {
    const urls = coverUrl ? getDisplayCoverCandidates(coverUrl, mode) : [];
    return [...urls, fallbackCover];
  }, [coverUrl, fallbackCover, mode]);
  const [candidateIndex, setCandidateIndex] = React.useState(0);

  React.useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  return (
    <img
      src={candidates[candidateIndex] || fallbackCover}
      alt={title}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        setCandidateIndex(index => Math.min(index + 1, candidates.length - 1));
      }}
    />
  );
}
