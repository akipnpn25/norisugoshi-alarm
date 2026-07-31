/*
# Create per-user station RPC functions

- ensure_default_stations(): 匿名利用者の初期駅を作成する。
- increment_station_use(): 自分の駅だけ利用回数を更新する。
*/

CREATE OR REPLACE FUNCTION public.ensure_default_stations()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.stations (
    user_id,
    id,
    name,
    kana,
    is_custom
  )
  SELECT
    auth.uid(),
    station.id,
    station.name,
    station.kana,
    false
  FROM (
    VALUES
      ('shinjuku', '新宿駅', 'しんじゅくえき'),
      ('shibuya', '渋谷駅', 'しぶやえき'),
      ('tokyo', '東京駅', 'とうきょうえき'),
      ('ikebukuro', '池袋駅', 'いけぶくろえき'),
      ('shinagawa', '品川駅', 'しながわえき'),
      ('shinbashi', '新橋駅', 'しんばしえき'),
      ('yurakucho', '有楽町駅', 'ゆうらくちょうえき'),
      ('akihabara', '秋葉原駅', 'あきはばらえき'),
      ('ueno', '上野駅', 'うえのえき'),
      ('kanda', '神田駅', 'かんだえき'),
      ('tokyo-stn', '東京タワー前', 'とうきょうたわーまえ'),
      ('hamamatsucho', '浜松町駅', 'はままつちょうえき'),
      ('tamachi', '田町駅', 'たまちえき'),
      ('ebisu', '恵比寿駅', 'えびすえき'),
      ('meguro', '目黒駅', 'めぐろえき'),
      ('gotanda', '五反田駅', 'ごたんだえき'),
      ('osaki', '大崎駅', 'おおさきえき'),
      ('kamata', '蒲田駅', 'かまたえき')
  ) AS station(id, name, kana)
  WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id, id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.increment_station_use(
  station_id text
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.stations
  SET
    use_count = use_count + 1,
    last_used_at = now()
  WHERE
    user_id = auth.uid()
    AND id = station_id;
$$;

REVOKE ALL
ON FUNCTION public.ensure_default_stations()
FROM PUBLIC, anon;

REVOKE ALL
ON FUNCTION public.increment_station_use(text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.ensure_default_stations()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.increment_station_use(text)
TO authenticated;
