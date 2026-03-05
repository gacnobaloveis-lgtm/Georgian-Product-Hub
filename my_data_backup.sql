--
-- PostgreSQL database dump
--

\restrict UCxJfQzsZhiHPDnVaLaU7cHnkSodb7koR7RysIL3fmxm64KnUpgIgn6MtsDfm5z

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
8	55206256	24	სარკე ვობლერი	20	ჯონი კაპანაძე	საქართველო	ბათუმი	ქობულეთის ქუჩა	599523351	pending	2026-02-27 13:42:52.444656	1	ოქროს ფერი
9	55303869	24	სარკე ვობლერი	20	ჯონი კაპანაძე	საქართველო	ოზურგეთი	რრრრნნზბს	599523351	pending	2026-02-27 13:52:17.605454	1	\N
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, original_price, discount_price, youtube_url, image_url, album_images, category_id, shipping_price, color_stock, sold_count, view_count, stock) FROM stdin;
22	დსდფდს	დფსდსფდს	44.00	4.00	https://www.youtube.com/shorts/qeAW4oAVoa4	/uploads/c7fce9a6-c5df-492e-8362-971d2980858d.webp	["/uploads/c7fce9a6-c5df-492e-8362-971d2980858d.webp","/uploads/29cf9b3a-5562-43ec-ab8a-529e07eaeae7.webp"]	\N	\N	{}	0	4	0
24	სარკე ვობლერი	ერთერთი საუკეთესო ვობლერი ქარიყლაპიაზე წონა 8 გრამი.	15.00	5.00	\N	/uploads/ae259dda-602b-4d23-a46e-3933e04ded20.webp	["/uploads/ae259dda-602b-4d23-a46e-3933e04ded20.webp","/uploads/1627081c-c501-4f68-a3f9-f76ec985e9b1.webp"]	7	15.00	{"ოქროს ფერი":7,"ვერცხლის ფერი":3,"მწვანე ფერი":0}	14	25	0
18	საშუკე ობლერი	ერთერთი საუკეთესო საშუკე ვობლერები საქართველოში თან ძალიან მაგარი საშუკე ობლერები საკაიფო ფასში	11.00	1.00	\N	/uploads/1657365f-5458-4b38-8b29-9841551de1bc.webp	["/uploads/1657365f-5458-4b38-8b29-9841551de1bc.webp","/uploads/c93c26b5-fc6c-44f8-b371-e7c18e1779a6.webp"]	\N	\N	{}	14	17	0
23	ვცხვცხ	ცვცხვ	33.00	33.00	\N	/uploads/34d48bd6-942b-448f-8db3-44946efc0ca6.webp	["/uploads/34d48bd6-942b-448f-8db3-44946efc0ca6.webp"]	4	\N	{}	0	14	0
19	სდფდფ	ფდფდსფგდს	34.00	3.00	\N	/uploads/80099031-c876-43b3-9aea-1b31588d9184.webp	["/uploads/80099031-c876-43b3-9aea-1b31588d9184.webp","/uploads/33f46b62-285f-424f-8328-3f2613854a56.webp"]	\N	\N	{}	0	2	0
21	სფდსფსდ	დფსდფდსფ	111.00	22.00	\N	/uploads/8367fa9d-8443-470e-96d9-10a374d8802c.webp	["/uploads/8367fa9d-8443-470e-96d9-10a374d8802c.webp","/uploads/5a50b22e-633a-4417-a71e-94a538c073cc.webp"]	\N	\N	{}	6	4	0
20	საქარიყლაპიე	წონა 5 გ ძალიან მაგარია	11.00	1.00	\N	/uploads/771aff39-ec10-4872-a4be-fd5e187217f4.webp	["/uploads/771aff39-ec10-4872-a4be-fd5e187217f4.webp","/uploads/54b62ddf-9177-4236-b3d7-d2fda08ef477.webp"]	\N	\N	{}	6	4	0
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
MX17mVtHdHfPkaj1LVPPInAvbO6CASKx	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-04T19:27:00.600Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "returnTo": "/product/19", "replit.com": {"code_verifier": "J0z61gsxPY4HhXG6SA1P0Xtw7vBjKMqUCXw2UaptgWI"}}	2026-03-04 19:27:21
qDFXS2dhX7UQYonU1YlJCQOnDstEtd0E	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-08T07:56:52.540Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "f120b61b-efbe-412c-a6ae-4d21ebd8fcc8", "exp": 1772355412, "iat": 1772351812, "iss": "https://replit.com/oidc", "sub": "55303869", "email": "mandaetis@gmail.com", "at_hash": "GsRRba-qYNlmIJl3h5HAbw", "username": "mandaetis", "auth_time": 1772222411, "last_name": null, "first_name": null, "email_verified": true}, "expires_at": 1772355412, "access_token": "BJiC_VlQsWyyfMGsifxbqnVd5wgM3gXqkoEEE1pxHA7", "refresh_token": "s8MrMx54tyOXvwh4zbxzHrcbJPFvJxBT2RoOPzvxjlO"}}, "adminRole": "admin"}	2026-03-08 07:56:53
84uFtYqGWC_SMo9IV1z_3kbCZaVCvgXZ	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T17:12:49.292Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "isAdmin": true}	2026-03-06 17:12:56
gqaOfYmw-ZnGXtKLMkyKq3ERYkDSOSJf	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-08T08:32:30.199Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "f120b61b-efbe-412c-a6ae-4d21ebd8fcc8", "exp": 1772357550, "iat": 1772353950, "iss": "https://replit.com/oidc", "sub": "55206256", "email": "gacnobaloveis@gmail.com", "at_hash": "pwKFZz1N23vUaMdIdyNbtA", "username": "gacnobaloveis", "auth_time": 1772221660, "last_name": null, "first_name": "goldfish", "email_verified": true}, "expires_at": 1772357550, "access_token": "8XxW1AE64UhzeRyMLXNby9GE7Bfe4nwE8IFKVc9PK2-", "refresh_token": "0xk4KqsqrPv9NbeCwv0CXpOz3w3KFiZzSC4SRNsMmsb"}}}	2026-03-08 08:57:46
ivBLCVjgKcYJhV9qVLs-WOpQ7KtkD7AD	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T16:47:08.469Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "isAdmin": true}	2026-03-06 16:47:29
63ir_ND2VOYjCLxIT9ZzPMG_kBWSYy5k	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-10T09:17:22.898Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "f120b61b-efbe-412c-a6ae-4d21ebd8fcc8", "exp": 1772533029, "iat": 1772529429, "iss": "https://replit.com/oidc", "sub": "55206256", "email": "gacnobaloveis@gmail.com", "at_hash": "78B_73Tyv0gBjRhVzpxiBQ", "username": "gacnobaloveis", "auth_time": 1772529429, "last_name": null, "first_name": "goldfish", "email_verified": true}, "expires_at": 1772533029, "access_token": "50FzLzVeYzFOJuVNrDhRPjz0iTI9A62gX_0D_w2jF7N", "refresh_token": "S3PjE_I6LP4-AiGUCkzt6nZR_6cTApHYWtzbJPmHyiW"}}, "adminRole": "admin"}	2026-03-10 09:20:37
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
55303869	mandaetis@gmail.com	ჯონი	კაპანაძე	\N	რრრრნნზბს	599523351	2026-02-27 13:51:08.947082	2026-02-27 20:00:12.44	ოზურგეთი	VS9WME	0.00	admin
55206256	gacnobaloveis@gmail.com	ჯონი	კაპანაძე	\N	ქობულეთის ქუჩა	599523351	2026-02-27 13:16:20.088366	2026-03-03 09:17:09.658	ბათუმი	JWW8GZ	0.00	admin
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 9, true);


--
-- Name: media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.media_id_seq', 35, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 9, true);


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
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- PostgreSQL database dump complete
--

\unrestrict UCxJfQzsZhiHPDnVaLaU7cHnkSodb7koR7RysIL3fmxm64KnUpgIgn6MtsDfm5z

