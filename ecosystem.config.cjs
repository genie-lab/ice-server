module.exports = {
  apps : [
    {
      name: 'ice-server',               // SSR 앱의 이름
      script: 'server.js',  // 빌드 후 생성된 SSR 앱 파일 경로
      instances: 2,                  // 인스턴스 수 (클러스터 모드에서 2개 인스턴스)
      exec_mode: 'cluster',          // 클러스터 모드로 실행
      autorestart: true,             // 앱이 종료되면 자동 재시작
      watch: false,                  // 파일 변경을 감지하고 자동으로 재시작 여부
      max_memory_restart: '1G',      // 앱의 메모리 사용량이 1GB를 초과하면 재시작
      env: {
        NODE_ENV: 'production',     // 환경 변수 설정
      }
    }
  ],
};
