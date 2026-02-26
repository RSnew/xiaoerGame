-- ============================================================
-- xiaoerGame 数据库初始化脚本
-- 在 Supabase SQL Editor (https://supabase.com/dashboard) 中运行
-- ============================================================

-- 1. 用户档案表
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL
             CHECK (char_length(username) >= 2 AND char_length(username) <= 20),
  gold       INTEGER DEFAULT 0 CHECK (gold >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 启用 Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS 策略：用户只能查看自己的档案（不允许直接 INSERT/UPDATE/DELETE）
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 4. 自动创建档案（注册时触发）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 5. 战斗奖励函数（服务端计算金币，防作弊）
CREATE OR REPLACE FUNCTION add_battle_reward()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward     INTEGER;
  last_time  TIMESTAMPTZ;
BEGIN
  -- 必须登录
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 冷却检查：至少 3 秒间隔，防刷
  SELECT updated_at INTO last_time
  FROM profiles WHERE id = auth.uid();

  IF last_time IS NOT NULL AND (now() - last_time) < INTERVAL '3 seconds' THEN
    RAISE EXCEPTION 'Too fast';
  END IF;

  -- 随机奖励 1~3 金币
  reward := floor(random() * 3 + 1)::INTEGER;

  UPDATE profiles
  SET gold = gold + reward, updated_at = now()
  WHERE id = auth.uid();

  RETURN reward;
END;
$$;

-- 6. 查询金币函数（便捷封装）
CREATE OR REPLACE FUNCTION get_my_gold()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g INTEGER;
BEGIN
  SELECT gold INTO g FROM profiles WHERE id = auth.uid();
  RETURN COALESCE(g, 0);
END;
$$;
