module.exports = {
  apps : [{
    name:'ice-server',
    script: 'cross-env NODE_ENV=production nodemon server.js',
    instances: 2, // 실행할 프로세스의 인스턴스 수
    // autorestart: true, // 애플리케이션의 자동 재시작 여부
    // watch: true, // 파일 변경 감지 및 재시작 여부
    exec_mode : 'cluster',  // 클러스터 모드
    wait_ready : true,
    listen_timeout : 50000,
    kill_timeout: 50000,
    env: {
      NODE_ENV: 'development',  // 개발 환경에서 사용할 NODE_ENV
      PORT: 4000
    },
    env_production: {
      NODE_ENV: 'production',  // 프로덕션 환경에서 사용할 NODE_ENV
      PORT: 8900
    }
  }],

  // deploy : {
  //   production : {
  //     user : 'SSH_USERNAME',
  //     host : 'SSH_HOSTMACHINE',
  //     ref  : 'origin/master',
  //     repo : 'GIT_REPOSITORY',
  //     path : 'DESTINATION_PATH',
  //     'pre-deploy-local': '',
  //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
  //     'pre-setup': ''
  //   }
  // }
};
