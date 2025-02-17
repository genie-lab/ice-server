module.exports = {
  apps : [{
    name:'ice-server',
    script: 'server.js',
    env: {
      NODE_ENV: 'development',  // 개발 환경 설정
    },
    env_production: {
      NODE_ENV: 'production',  // 프로덕션 환경 설정
    },
    instances: 1, // 실행할 프로세스의 인스턴스 수
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
