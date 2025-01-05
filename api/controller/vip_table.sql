CREATE TABLE vip_{{table}} (
    vi_id int(11) unsigned auto_increment,
    vi_reply int(11) unsigned not null default 0 comment '답글',
    vi_grp int(11) unsigned not null default 0,
    vi_order int(11) unsigned not null default 0,
    vi_dep tinyint unsigned not null default 0,
    vi_parent int(11) unsigned not null default 0,
    mb_id varchar(191) not null default '',
    -- vi_email varchar(191) not null default '',
    -- vi_name varchar(191) not null default '',
    -- vi_password varchar(191) not null default '',
    vi_category varchar(191) not null default '',
    -- vi_title varchar(191) not null default '',
    -- vi_content longtext not null ,
    -- vi_summary longtext not null ,
    -- vi_view int(11) unsigned not null default 0,
    vi_close int(11) unsigned not null default 0 comment '마감액',
    vi_spend int(11) unsigned not null default 0 comment '지출액',
    vi_focus_at DATETIME default CURRENT_TIMESTAMP() comment '지정일',
    vi_history varchar(191) not null default '' comment '내역',


    vi_use tinyint DEFAULT '1' COMMENT '삭제시 0변환',
    vi_ip varchar(20) not null,
    vi_create_at datetime not null,
    vi_update_at datetime not null,
    vi_1 varchar(191) not null default '',
    vi_2 varchar(191) not null default '',
    vi_3 varchar(191) not null default '',
    vi_4 varchar(191) not null default '',
    vi_5 varchar(191) not null default '',
    vi_6 varchar(191) not null default '',
    vi_7 varchar(191) not null default '',
    vi_8 varchar(191) not null default '',
    vi_9 varchar(191) not null default '',
    vi_10 varchar(191) not null default '',
    primary key (vi_id),
    index (vi_reply, vi_grp, vi_order, vi_parent)
);
CREATE view view_vip_{{table}} AS
SELECT vi_id, vi_reply, vi_grp, vi_order, vi_dep, vi_parent, mb_id, vi_category, vi_close, vi_spend, vi_focus_at, vi_history, vi_ip, vi_create_at, vi_update_at,
    vi_1,vi_2,vi_3,vi_4,vi_5,vi_6,vi_7,vi_8,vi_9,vi_10,
    (SELECT count(*) FROM vip_{{table}} WHERE vi_reply=w.vi_id) as replys
FROM vip_{{table}} AS w;
