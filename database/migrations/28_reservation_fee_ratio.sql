-- Q37–Q39: Phí giữ chỗ = 20% học phí (cấu hình được)
INSERT INTO system_config(key, value)
VALUES ('reservation_fee_ratio', '0.2')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
