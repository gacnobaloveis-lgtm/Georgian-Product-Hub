--
-- PostgreSQL database dump
--

\restrict L4kraZhusViIoeXwCZpbabMiDZwpm4RazambLcJgagiH3ryAyXLsJ2bVKkRtMFd

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    icon text
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media (
    id integer NOT NULL,
    filename text NOT NULL,
    original_name text NOT NULL,
    path text NOT NULL,
    size numeric,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.media OWNER TO postgres;

--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.media_id_seq OWNER TO postgres;

--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    product_id integer NOT NULL,
    product_name text NOT NULL,
    product_price character varying NOT NULL,
    full_name character varying NOT NULL,
    country character varying DEFAULT 'საქართველო'::character varying NOT NULL,
    city character varying NOT NULL,
    address text NOT NULL,
    phone character varying NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    quantity integer DEFAULT 1 NOT NULL,
    selected_color character varying
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: page_visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_visits (
    id integer NOT NULL,
    referrer_domain character varying,
    referrer_url text,
    page_path text NOT NULL,
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.page_visits OWNER TO postgres;

--
-- Name: page_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.page_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.page_visits_id_seq OWNER TO postgres;

--
-- Name: page_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.page_visits_id_seq OWNED BY public.page_visits.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    original_price numeric(10,2) NOT NULL,
    discount_price numeric(10,2),
    youtube_url text,
    image_url text,
    album_images text DEFAULT '[]'::text,
    category_id integer,
    shipping_price numeric(10,2),
    color_stock text DEFAULT '{}'::text,
    sold_count integer DEFAULT 0 NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: referral_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_logs (
    id integer NOT NULL,
    referrer_user_id character varying NOT NULL,
    buyer_user_id character varying NOT NULL,
    order_id integer NOT NULL,
    product_name text NOT NULL,
    product_price character varying NOT NULL,
    credit_awarded numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.referral_logs OWNER TO postgres;

--
-- Name: referral_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.referral_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referral_logs_id_seq OWNER TO postgres;

--
-- Name: referral_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.referral_logs_id_seq OWNED BY public.referral_logs.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_settings (
    key character varying NOT NULL,
    value character varying NOT NULL
);


ALTER TABLE public.site_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    address character varying,
    phone character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    city character varying,
    referral_code character varying,
    my_credit numeric(10,2) DEFAULT 0,
    role character varying DEFAULT 'user'::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: page_visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_visits ALTER COLUMN id SET DEFAULT nextval('public.page_visits_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: referral_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_logs ALTER COLUMN id SET DEFAULT nextval('public.referral_logs_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, icon) FROM stdin;
4	სპინინგის ჯოხები	\N
5	სპინინგის კოჭები	\N
6	სპინინგის წნულები	\N
7	ვობლერები	\N
8	ტრიალები	\N
9	ყანყალები	\N
10	სპ.ჟილეტები	\N
11	მორმიშინგი	/uploads/mormishing-icon.png
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media (id, filename, original_name, path, size, created_at) FROM stdin;
23	1657365f-5458-4b38-8b29-9841551de1bc.webp	IMG_20251005_230318.jpg	/uploads/1657365f-5458-4b38-8b29-9841551de1bc.webp	208412	2026-02-23 22:05:39.823856
24	c93c26b5-fc6c-44f8-b371-e7c18e1779a6.webp	channels4_profile.jpg	/uploads/c93c26b5-fc6c-44f8-b371-e7c18e1779a6.webp	27998	2026-02-23 22:05:49.832596
25	80099031-c876-43b3-9aea-1b31588d9184.webp	channels4_profile.jpg	/uploads/80099031-c876-43b3-9aea-1b31588d9184.webp	27998	2026-02-23 22:09:53.831561
26	33f46b62-285f-424f-8328-3f2613854a56.webp	IMG_20251005_230318.jpg	/uploads/33f46b62-285f-424f-8328-3f2613854a56.webp	208412	2026-02-23 22:10:05.477517
27	771aff39-ec10-4872-a4be-fd5e187217f4.webp	IMG_20251005_230318.jpg	/uploads/771aff39-ec10-4872-a4be-fd5e187217f4.webp	208412	2026-02-23 22:11:22.83251
28	54b62ddf-9177-4236-b3d7-d2fda08ef477.webp	channels4_profile.jpg	/uploads/54b62ddf-9177-4236-b3d7-d2fda08ef477.webp	27998	2026-02-23 22:11:29.81206
29	8367fa9d-8443-470e-96d9-10a374d8802c.webp	IMG_20251005_230318.jpg	/uploads/8367fa9d-8443-470e-96d9-10a374d8802c.webp	208412	2026-02-23 22:41:36.879157
30	5a50b22e-633a-4417-a71e-94a538c073cc.webp	channels4_profile.jpg	/uploads/5a50b22e-633a-4417-a71e-94a538c073cc.webp	27998	2026-02-23 22:41:47.110097
31	c7fce9a6-c5df-492e-8362-971d2980858d.webp	channels4_profile.jpg	/uploads/c7fce9a6-c5df-492e-8362-971d2980858d.webp	27998	2026-02-23 22:47:14.151692
32	29cf9b3a-5562-43ec-ab8a-529e07eaeae7.webp	IMG_20251005_230318.jpg	/uploads/29cf9b3a-5562-43ec-ab8a-529e07eaeae7.webp	208412	2026-02-23 22:47:22.595556
33	34d48bd6-942b-448f-8db3-44946efc0ca6.webp	IMG_20251005_230318.jpg	/uploads/34d48bd6-942b-448f-8db3-44946efc0ca6.webp	208412	2026-02-24 03:05:01.387064
34	ae259dda-602b-4d23-a46e-3933e04ded20.webp	1000021404.jpg	/uploads/ae259dda-602b-4d23-a46e-3933e04ded20.webp	76872	2026-02-25 08:46:40.053481
35	1627081c-c501-4f68-a3f9-f76ec985e9b1.webp	1000021318.jpg	/uploads/1627081c-c501-4f68-a3f9-f76ec985e9b1.webp	78666	2026-02-25 08:48:13.397809
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, product_id, product_name, product_price, full_name, country, city, address, phone, status, created_at, quantity, selected_color) FROM stdin;
8	55206256	24	სარკე ვობლერი	20	ჯონი კაპანაძე	საქართველო	ბათუმი	ქობულეთის ქუჩა	599523351	shipped	2026-02-27 13:42:52.444656	1	ოქროს ფერი
9	55303869	24	სარკე ვობლერი	20	ჯონი კაპანაძე	საქართველო	ოზურგეთი	რრრრნნზბს	599523351	shipped	2026-02-27 13:52:17.605454	1	\N
10	fb_122111461623232523	18	საშუკე ობლერი	1	ჯონი გიგაური	საქართველო	ქუთაისი	გიორგის ქუჩა	5995433216	shipped	2026-03-03 15:27:38.02574	1	\N
11	55303869	21	სფდსფსდ	22	ჯონი კაპანაძე	საქართველო	ოზურგეთი	რრრრნნზბს	599523351	shipped	2026-03-03 17:16:57.81303	1	\N
\.


--
-- Data for Name: page_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.page_visits (id, referrer_domain, referrer_url, page_path, user_agent, created_at) FROM stdin;
1	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 16:47:10.857293
2	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 16:47:11.929584
3	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 16:47:12.492168
4	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:03:56.645255
5	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:03:56.834485
6	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:03:57.014598
7	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:04:38.651766
8	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:04:39.374116
9	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:04:39.857987
10	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:08:15.320499
11	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:08:15.535461
12	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:08:15.857422
13	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:08:47.00721
14	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:08:47.196517
15	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:08:47.374646
16	\N	\N	/profile	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:10:18.410833
17	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:10:18.60123
18	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:10:18.612413
19	\N	\N	/product/18	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:10:44.33534
20	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:10:44.92169
21	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:10:44.922176
22	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:12:57.667242
23	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:12:57.858442
24	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 17:12:57.870625
25	\N	\N	/product/21	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:14:51.624714
26	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:14:52.216785
27	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:14:52.449303
28	\N	\N	/product/21	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:16:18.89339
29	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:16:19.496999
30	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:16:19.712982
31	\N	\N	/profile	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:17:35.161873
32	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:17:35.411752
33	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 17:17:35.434522
34	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:05:49.026658
35	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:05:49.225691
36	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:05:49.436861
37	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:09:21.835574
38	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:09:22.542998
39	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:09:22.728159
40	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:11:08.5046
41	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:11:09.10873
42	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:11:09.349588
43	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:11:11.38966
44	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:11:12.009592
45	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:11:12.228578
46	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:16:48.061652
47	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:16:48.797775
48	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:16:48.999822
49	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:32:02.916719
50	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:32:03.522306
51	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:32:03.761922
52	\N	\N	/profile	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:32:12.809795
53	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:32:13.089938
54	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:32:13.108585
55	\N	\N	/profile	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:33:31.12124
56	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:33:31.398957
57	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:33:31.478852
58	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:33:41.121812
59	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:33:41.397652
60	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:33:41.412406
61	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:35:29.224597
62	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:35:29.593828
63	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:35:29.766517
64	\N	\N	/profile	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:36:28.957069
65	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:36:29.530046
66	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:36:29.613667
67	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:36:38.040456
68	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:36:38.319404
69	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-03 18:36:38.360761
70	\N	\N	/profile	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:18.831826
71	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:19.092297
72	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:19.100104
73	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:27.562939
74	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:27.824599
75	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:27.837468
76	\N	\N	/product/21	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:51.017142
77	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:51.283232
78	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-03 18:37:51.29671
79	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 12:57:59.491777
80	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 12:58:02.122665
81	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 12:58:02.914913
82	\N	\N	/product/18	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 12:59:26.44406
83	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 12:59:27.071604
84	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 12:59:27.088069
85	\N	\N	/product/18	facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)	2026-03-04 13:00:10.052474
86	\N	\N	/product/18	facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)	2026-03-04 13:00:11.991095
87	\N	\N	/product/18	facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)	2026-03-04 13:00:25.134806
88	\N	\N	/profile	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:01:34.475725
89	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:01:34.818162
90	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:01:34.827067
91	\N	\N	/product/18	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:08:55.146533
92	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:08:55.834182
93	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:08:56.059058
94	\N	\N	/product/19	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:54:01.310789
95	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:54:01.823718
96	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 13:54:01.913797
97	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:24:58.990808
98	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:24:59.364339
99	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:24:59.578703
100	\N	\N	/profile	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:36:49.297768
101	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:36:49.692937
102	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:36:49.731725
103	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:36:59.37043
104	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:36:59.693579
105	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 14:36:59.713145
106	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 15:30:06.456933
107	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 15:30:07.19887
108	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 15:30:07.402463
109	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 16:06:38.661291
110	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 16:06:39.401096
111	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 16:06:41.245727
112	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 16:35:02.903614
113	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 16:35:03.536173
114	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 16:35:04.233024
115	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 16:36:02.815764
116	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 16:36:03.414581
117	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 16:36:03.622329
118	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 16:51:09.171973
119	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 17:56:45.603962
120	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 17:56:46.197246
121	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 17:56:46.54187
122	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 18:17:38.35833
123	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 18:17:39.090583
124	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 18:17:39.276678
125	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 19:09:55.292988
126	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 19:09:56.054536
127	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-04 19:09:56.319928
128	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:23:46.152491
129	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:23:46.635419
130	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:23:46.746651
131	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:48:46.426575
132	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:48:47.028482
133	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:48:47.369003
134	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:53:07.575802
135	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:53:08.159967
136	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 20:53:08.422668
137	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 21:51:45.34531
138	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 21:51:45.955145
139	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-04 21:51:46.286681
140	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:39:31.424018
141	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:39:32.775948
142	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:39:33.336378
143	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:42:59.104313
144	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:42:59.335921
145	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:42:59.556536
146	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:55:56.938272
147	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:55:57.654657
148	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 02:55:58.616696
149	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 02:56:10.828022
150	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 02:56:11.433269
151	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 02:56:11.479931
152	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 05:31:40.930101
153	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 05:31:41.630253
154	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 05:31:42.004107
155	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:41:15.434444
156	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:41:15.785892
157	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:41:16.112507
158	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:41:58.654417
159	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:41:58.932581
160	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:41:58.945869
161	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:42:37.294916
162	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:42:37.888978
163	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 13:42:37.892837
164	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:06:32.774317
165	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:06:33.45835
166	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:06:33.888689
167	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:07:10.551403
168	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:07:11.003648
169	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:07:11.03337
170	\N	\N	/product/24	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:08:03.238305
171	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:08:03.939854
172	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:08:03.954064
173	\N	\N	/product/24	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:08:33.510425
174	\N	\N	/	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:21:59.488398
175	\N	\N	/@vite/client	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:22:00.092697
176	\N	\N	/@react-refresh	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-05 14:22:00.12302
177	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 14:48:34.372971
178	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 14:48:35.093657
179	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 14:48:35.475965
180	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 14:48:56.430064
181	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 14:48:57.168014
182	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 14:48:57.385925
183	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:28:39.501095
184	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:28:40.218207
185	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:28:40.403359
186	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:33:48.743053
187	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:33:49.83806
188	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:33:50.134013
189	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:46:59.154151
190	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:46:59.866111
191	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 15:47:00.255427
192	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:32:34.184018
193	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:32:35.241986
194	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:32:35.559233
195	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:45:11.664095
196	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:45:12.423324
197	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:45:12.61546
198	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:49:12.610076
199	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:49:13.342536
200	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 16:49:13.531569
201	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 17:02:49.287283
202	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 17:02:50.053408
203	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 18:24:56.548333
204	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 18:24:57.477401
205	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 18:24:58.083108
206	\N	\N	/	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 18:29:36.079238
207	\N	\N	/@vite/client	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 18:29:36.503676
208	\N	\N	/@react-refresh	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-05 18:29:36.683432
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, original_price, discount_price, youtube_url, image_url, album_images, category_id, shipping_price, color_stock, sold_count, view_count, stock) FROM stdin;
19	სდფდფ	ფდფდსფგდს	34.00	3.00	\N	/uploads/80099031-c876-43b3-9aea-1b31588d9184.webp	["/uploads/80099031-c876-43b3-9aea-1b31588d9184.webp","/uploads/33f46b62-285f-424f-8328-3f2613854a56.webp"]	\N	\N	{}	0	4	0
18	საშუკე ობლერი	ერთერთი საუკეთესო საშუკე ვობლერები საქართველოში თან ძალიან მაგარი საშუკე ობლერები საკაიფო ფასში	11.00	1.00	\N	/uploads/1657365f-5458-4b38-8b29-9841551de1bc.webp	["/uploads/1657365f-5458-4b38-8b29-9841551de1bc.webp","/uploads/c93c26b5-fc6c-44f8-b371-e7c18e1779a6.webp"]	\N	\N	{}	15	37	15
22	დსდფდს	დფსდსფდს	44.00	4.00	https://www.youtube.com/shorts/qeAW4oAVoa4	/uploads/c7fce9a6-c5df-492e-8362-971d2980858d.webp	["/uploads/c7fce9a6-c5df-492e-8362-971d2980858d.webp","/uploads/29cf9b3a-5562-43ec-ab8a-529e07eaeae7.webp"]	\N	\N	{}	0	7	0
20	საქარიყლაპიე	წონა 5 გ ძალიან მაგარია	11.00	1.00	\N	/uploads/771aff39-ec10-4872-a4be-fd5e187217f4.webp	["/uploads/771aff39-ec10-4872-a4be-fd5e187217f4.webp","/uploads/54b62ddf-9177-4236-b3d7-d2fda08ef477.webp"]	\N	\N	{}	6	9	0
24	სარკე ვობლერი	ერთერთი საუკეთესო ვობლერი ქარიყლაპიაზე წონა 8 გრამი.	15.00	5.00	\N	/uploads/ae259dda-602b-4d23-a46e-3933e04ded20.webp	["/uploads/ae259dda-602b-4d23-a46e-3933e04ded20.webp","/uploads/1627081c-c501-4f68-a3f9-f76ec985e9b1.webp"]	7	15.00	{"ოქროს ფერი":7,"ვერცხლის ფერი":3,"მწვანე ფერი":0}	14	31	0
23	ვცხვცხ	ცვცხვ	33.00	33.00	\N	/uploads/34d48bd6-942b-448f-8db3-44946efc0ca6.webp	["/uploads/34d48bd6-942b-448f-8db3-44946efc0ca6.webp"]	4	\N	{}	0	16	0
21	სფდსფსდ	დფსდფდსფ	111.00	22.00	\N	/uploads/8367fa9d-8443-470e-96d9-10a374d8802c.webp	["/uploads/8367fa9d-8443-470e-96d9-10a374d8802c.webp","/uploads/5a50b22e-633a-4417-a71e-94a538c073cc.webp"]	\N	\N	{}	7	9	0
\.


--
-- Data for Name: referral_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referral_logs (id, referrer_user_id, buyer_user_id, order_id, product_name, product_price, credit_awarded, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
qDFXS2dhX7UQYonU1YlJCQOnDstEtd0E	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-08T07:56:52.540Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "f120b61b-efbe-412c-a6ae-4d21ebd8fcc8", "exp": 1772355412, "iat": 1772351812, "iss": "https://replit.com/oidc", "sub": "55303869", "email": "mandaetis@gmail.com", "at_hash": "GsRRba-qYNlmIJl3h5HAbw", "username": "mandaetis", "auth_time": 1772222411, "last_name": null, "first_name": null, "email_verified": true}, "expires_at": 1772355412, "access_token": "BJiC_VlQsWyyfMGsifxbqnVd5wgM3gXqkoEEE1pxHA7", "refresh_token": "s8MrMx54tyOXvwh4zbxzHrcbJPFvJxBT2RoOPzvxjlO"}}, "adminRole": "admin"}	2026-03-08 07:56:53
84uFtYqGWC_SMo9IV1z_3kbCZaVCvgXZ	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T17:12:49.292Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "isAdmin": true}	2026-03-06 17:12:56
gqaOfYmw-ZnGXtKLMkyKq3ERYkDSOSJf	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-08T08:32:30.199Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "f120b61b-efbe-412c-a6ae-4d21ebd8fcc8", "exp": 1772357550, "iat": 1772353950, "iss": "https://replit.com/oidc", "sub": "55206256", "email": "gacnobaloveis@gmail.com", "at_hash": "pwKFZz1N23vUaMdIdyNbtA", "username": "gacnobaloveis", "auth_time": 1772221660, "last_name": null, "first_name": "goldfish", "email_verified": true}, "expires_at": 1772357550, "access_token": "8XxW1AE64UhzeRyMLXNby9GE7Bfe4nwE8IFKVc9PK2-", "refresh_token": "0xk4KqsqrPv9NbeCwv0CXpOz3w3KFiZzSC4SRNsMmsb"}}}	2026-03-08 08:57:46
x_sdZEdioTtfv8QGsLz7YUyGiVaGm__2	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-12T14:16:00.983Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "f120b61b-efbe-412c-a6ae-4d21ebd8fcc8", "exp": 1772723282, "iat": 1772719682, "iss": "https://replit.com/oidc", "sub": "55303869", "email": "mandaetis@gmail.com", "at_hash": "ckO2DX0GuT8Nd9Cw0DtM9A", "username": "mandaetis", "auth_time": 1772719682, "last_name": null, "first_name": null, "email_verified": true}, "expires_at": 1772723282, "access_token": "IewJkwdF9v6QXfBh69SIV4gK-YybC9MU6LbXHoKWvTe", "refresh_token": "P0fcquLcm7MBU5hhLgUfApOjk5ecmHhImyYPYWCiR_M"}}, "adminRole": "admin"}	2026-03-12 14:22:05
8jGq8xRA5CBKdr7aO8gq1cz-lr0vSlCv	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-10T18:37:50.819Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"sub": "fb_122111461623232523"}, "expires_at": 1773167870}}}	2026-03-12 17:02:52
ivBLCVjgKcYJhV9qVLs-WOpQ7KtkD7AD	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T16:47:08.469Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "isAdmin": true}	2026-03-06 16:47:29
vxWtOHIjaUqktKRTKS0UN8je5PqS3Oxr	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T16:33:32.571Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "isAdmin": true}	2026-03-06 16:34:10
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_settings (key, value) FROM stdin;
referral_credit_amount	1
credit_to_gel	1.5
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, address, phone, created_at, updated_at, city, referral_code, my_credit, role) FROM stdin;
55206256	gacnobaloveis@gmail.com	ჯონი	კაპანაძე	\N	ქობულეთის ქუჩა	599523351	2026-02-27 13:16:20.088366	2026-03-03 15:28:37.886	ბათუმი	JWW8GZ	0.00	admin
fb_122111461623232523	giorgadzejibo@gmail.com	ჯონი	გიგაური	https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=122111461623232523&height=200&width=200&ext=1775155070&hash=AT_W5Zt82sSf2zhFiPSVaG_u	გიორგის ქუჩა	5995433216	2026-03-03 15:08:25.124804	2026-03-03 18:37:50.8	ქუთაისი	9Z82KJ	0.00	user
55303869	mandaetis@gmail.com	ჯონი	კაპანაძე	\N	რრრრნნზბს	599523351	2026-02-27 13:51:08.947082	2026-03-05 14:08:02.916	ოზურგეთი	VS9WME	0.00	admin
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 11, true);


--
-- Name: media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.media_id_seq', 35, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 11, true);


--
-- Name: page_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.page_visits_id_seq', 208, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 24, true);


--
-- Name: referral_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.referral_logs_id_seq', 1, false);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: page_visits page_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_visits
    ADD CONSTRAINT page_visits_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: referral_logs referral_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_logs
    ADD CONSTRAINT referral_logs_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: IDX_page_visits_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_page_visits_created" ON public.page_visits USING btree (created_at);


--
-- Name: IDX_page_visits_domain; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_page_visits_domain" ON public.page_visits USING btree (referrer_domain);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- PostgreSQL database dump complete
--

\unrestrict L4kraZhusViIoeXwCZpbabMiDZwpm4RazambLcJgagiH3ryAyXLsJ2bVKkRtMFd

