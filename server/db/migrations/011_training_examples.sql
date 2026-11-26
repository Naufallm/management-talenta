CREATE TEMP TABLE training_example_sources ON COMMIT DROP AS
SELECT DISTINCT ON (t.employee_id,t.period_id) t.employee_id,t.period_id,t.created_by,p.year,
       'course-example-' || md5(t.employee_id || '/' || t.period_id) AS key
FROM trainings t JOIN periods p ON p.id=t.period_id JOIN employees e ON e.id=t.employee_id
LEFT JOIN documents d ON d.id=t.document_id
WHERE p.status='OPEN' AND e.active AND
  (t.id LIKE 'review-release-%' OR t.id LIKE 'demo-dev-%' OR
   (d.name LIKE 'Ringkasan kegiatan %.txt' AND d.mime='text/plain' AND
    encode(d.contents,'escape') LIKE 'Data simulasi lokal untuk menguji alur aplikasi%'))
ORDER BY t.employee_id,t.period_id,t.id;

UPDATE trainings SET organizer='Pusat Pendidikan dan Pelatihan',place='Daring',activity_type='Pengembangan kompetensi',
name=replace(name,'[DUMMY SEMENTARA] ','')
WHERE id LIKE 'demo-dev-%' AND organizer='[DUMMY SEMENTARA] Contoh penyelenggara';
UPDATE achievements SET organizer='Forum Pengembangan Kompetensi',activity_type='Apresiasi kontribusi',
name=replace(name,'[DUMMY SEMENTARA] ','')
WHERE id LIKE 'demo-dev-%' AND organizer='[DUMMY SEMENTARA] Contoh penyelenggara';

INSERT INTO documents(id,employee_id,name,mime,contents)
SELECT key || '-agenda',employee_id,'Agenda lokakarya.txt','text/plain',
convert_to('Agenda lokakarya: pemeriksaan data, latihan menyusun metadata, dan pembahasan hasil.','UTF8')
FROM training_example_sources;

INSERT INTO trainings(id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,document_id,verified,created_by,place)
SELECT key || '-data',employee_id,period_id,'Lokakarya Kualitas Data dan Metadata Statistik','Teknis',
make_date(year,3,12),'Forum Pembelajaran Statistik',6,key || '-agenda',false,created_by,'Ruang pelatihan'
FROM training_example_sources
UNION ALL
SELECT key || '-tim',employee_id,period_id,'Komunikasi Pelayanan Publik','Pelayanan',
make_date(year,4,15),'Forum Pembelajaran Internal',4,NULL,false,created_by,'Daring'
FROM training_example_sources;

INSERT INTO achievements(id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,verified,created_by,award_level,award_scope)
SELECT key || '-penghargaan',employee_id,period_id,'Kontribusi Pendampingan Pembelajaran','Apresiasi tim',
make_date(year,5,14),'Forum Pembelajaran Internal',0,false,created_by,'CITY','INTERNAL'
FROM training_example_sources;
