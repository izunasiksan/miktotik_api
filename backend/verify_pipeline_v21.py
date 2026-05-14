import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.services import analysis_service

# Configuration
DB_URL = "postgresql+asyncpg://postgres:root@127.0.0.1:5432/db_master_mikrotik"
TARGET_UUID = uuid.UUID("5170f8cc-1ab4-4328-8cff-435f7c9412c7")

async def verify_pipeline():
    engine = create_async_engine(DB_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        print(f"--- Verifying Pipeline V2.1 for Board: {TARGET_UUID} ---")
        
        end_time = datetime.now()
        start_time = end_time - timedelta(days=7)
        granularity = "hour"
        
        temp_table = None
        try:
            # STAGE 1: Context Lock
            print("\n[STAGE 1] Creating Scoped Dataset...")
            temp_table = await analysis_service.create_scoped_dataset(
                db=db,
                board_id=TARGET_UUID,
                start_time=start_time,
                end_time=end_time,
                granularity=granularity
            )
            print(f"Success: Temp Table Created -> {temp_table}")
            
            # STAGE 2: Trend & Aggregation
            print("\n[STAGE 2] Running Trend Analysis...")
            trend_data = await analysis_service.get_trend_analysis(db=db, temp_table=temp_table)
            print(f"Success: Trend Data Summary -> {trend_data['summary']}")
            
            # STAGE 3-5: Advanced Analytics
            print("\n[STAGE 3-5] Running Advanced Analytics...")
            analytics_data = await analysis_service.get_advanced_analytics(db=db, temp_table=temp_table)
            print(f"Success: Correlation RX vs CPU -> {analytics_data['correlation']['rx_vs_cpu']}")
            print(f"Success: Anomaly Count -> {analytics_data['anomaly']['detected_count']}")
            
            # STAGE 6: Health Score
            print("\n[STAGE 6] Calculating Health Score...")
            health_score = await analysis_service.calculate_health_score(
                trend_data=trend_data,
                analytics_data=analytics_data
            )
            print(f"Success: Total Health Score -> {health_score['total_score']}")
            print(f"Success: Components -> {health_score['components']}")
            
            # STAGE 7: Insights
            print("\n[STAGE 7] Generating Insights...")
            insights = await analysis_service.generate_insights(
                trend_data=trend_data,
                analytics_data=analytics_data,
                health_score=health_score
            )
            print(f"Success: Generated {len(insights)} Insights.")
            for insight in insights:
                print(f" - [{insight['level'].upper()}] {insight['title']}: {insight['message']}")
            
            print("\n--- Pipeline Verification Completed Successfully ---")
            
        except Exception as e:
            print(f"\n!!! Pipeline Verification Failed: {str(e)} !!!")
            import traceback
            traceback.print_exc()
        finally:
            # Clean up temp table
            if temp_table:
                print(f"\n[CLEANUP] Dropping Temp Table {temp_table}...")
                await db.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))
                await db.commit()
                print("Success: Temp Table Dropped.")

if __name__ == "__main__":
    asyncio.run(verify_pipeline())
