-- Update review_flashcard RPC to implement a proper SM-2 spaced repetition algorithm

CREATE OR REPLACE FUNCTION public.review_flashcard(
  p_card_id uuid,
  p_rating  public.flashcard_review_rating
)
RETURNS public.flashcard_reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_review public.flashcard_reviews;
  v_ease numeric(4,2);
  v_interval integer;
  v_reps integer;
  v_next timestamptz;
BEGIN
  -- Authenticated user check
  IF auth.uid() IS NULL THEN 
    RAISE EXCEPTION 'Authentication is required.'; 
  END IF;

  -- Ensure the card exists and belongs to the authenticated user
  IF NOT EXISTS (
    SELECT 1 FROM public.flashcards f
    JOIN public.flashcard_collections fc ON fc.id = f.collection_id
    WHERE f.id = p_card_id AND f.type = 'user' AND fc.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Flashcard was not found or access denied.';
  END IF;

  -- Record the review history
  INSERT INTO public.flashcard_reviews (card_id, user_id, rating)
  VALUES (p_card_id, auth.uid(), p_rating)
  RETURNING * INTO v_review;

  -- Fetch current schedule or initialize defaults
  SELECT ease_factor, interval_days, repetitions
  INTO v_ease, v_interval, v_reps
  FROM public.flashcard_schedule
  WHERE card_id = p_card_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    v_ease := 2.50;
    v_interval := 0;
    v_reps := 0;
  END IF;

  -- Calculate the next spaced repetition schedule using the SM-2 algorithm
  IF p_rating = 'again' THEN
    v_ease := greatest(1.30, v_ease - 0.20);
    v_interval := 0;
    v_reps := 0;
  ELSIF p_rating = 'hard' THEN
    v_ease := greatest(1.30, v_ease - 0.15);
    IF v_reps = 0 THEN
      v_interval := 1;
    ELSIF v_reps = 1 THEN
      v_interval := 3;
    ELSE
      v_interval := ceil(v_interval * 1.20);
    END IF;
    v_reps := v_reps + 1;
  ELSIF p_rating = 'good' THEN
    -- Ease remains unchanged for good
    IF v_reps = 0 THEN
      v_interval := 1;
    ELSIF v_reps = 1 THEN
      v_interval := 4;
    ELSE
      v_interval := ceil(v_interval * v_ease);
    END IF;
    v_reps := v_reps + 1;
  ELSIF p_rating = 'easy' THEN
    v_ease := least(3.00, v_ease + 0.15);
    IF v_reps = 0 THEN
      v_interval := 4;
    ELSIF v_reps = 1 THEN
      v_interval := 8;
    ELSE
      v_interval := ceil(v_interval * v_ease * 1.30);
    END IF;
    v_reps := v_reps + 1;
  END IF;

  -- Map interval to a timestamp
  IF v_interval = 0 THEN
    v_next := now() + interval '10 minutes';
  ELSE
    v_next := now() + (v_interval || ' days')::interval;
  END IF;

  -- Insert or update schedule
  INSERT INTO public.flashcard_schedule (
    card_id, user_id, next_review, last_review, ease_factor, interval_days, repetitions
  ) VALUES (
    p_card_id, auth.uid(), v_next, now(), v_ease, v_interval, v_reps
  )
  ON CONFLICT (card_id, user_id) DO UPDATE SET
    next_review   = v_next,
    last_review   = now(),
    ease_factor   = v_ease,
    interval_days = v_interval,
    repetitions   = v_reps;

  -- Track stats & achievements
  PERFORM public.increment_daily_user_activity(auth.uid(), p_flashcards_reviewed => 1);
  PERFORM public.award_module_xp('flashcard_reviewed');
  PERFORM public.record_activity_event(
    'flashcard_reviewed', 'flashcard_reviews', v_review.id,
    jsonb_build_object('card_id', p_card_id, 'rating', p_rating),
    'private', 'flashcard_reviewed', 'Flashcard reviewed',
    'You reviewed a flashcard.', 'happy'
  );

  RETURN v_review;
END;
$$;
